/**
 * @file Gift Service
 * @description Business logic for gift operations
 */

import type { PrismaClient, TokenType } from '@prisma/client'
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { DeGiftAbi, ERC20Abi } from '../abi/DeGift'

export interface CreateGiftParams {
  recipientAddress: string
  tokenType: 'ETH' | 'ERC20' | 'ERC721' | 'ERC1155'
  tokenAddress?: string
  tokenId?: string
  amount: string
  daysUntilExpiry: number
  message?: string
  senderAddress: string
}

export interface ClaimGiftParams {
  giftId: string
  claimerAddress: string
}

export interface GetUserGiftsParams {
  page?: number
  limit?: number
  status?: 'PENDING' | 'CLAIMED' | 'REFUNDED' | 'EXPIRED'
  sortBy?: 'createdAt' | 'expiresAt'
  order?: 'asc' | 'desc'
}

export interface RecordClaimParams {
  txHash: string
  gasUsed?: string
  gasPrice?: string
}

export class GiftService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a gift on-chain and in database
   * Note: This is a helper for creating gifts via proxy wallet
   * In production, gifts should be created directly by users from frontend
   */
  async createGift(params: CreateGiftParams) {
    const {
      recipientAddress,
      tokenType,
      tokenAddress,
      tokenId,
      amount,
      daysUntilExpiry,
      message = '',
      senderAddress,
    } = params

    // Validate environment
    const RPC_URL = process.env.ETHEREUM_RPC_URL
    const PRIVATE_KEY = process.env.PROXY_WALLET_PRIVATE_KEY
    const DEGIFT_CONTRACT = process.env.DEGIFT_CONTRACT_ADDRESS as Address

    if (!RPC_URL || !PRIVATE_KEY || !DEGIFT_CONTRACT) {
      throw new Error('Missing blockchain configuration')
    }

    // Setup clients
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    })

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })

    // Calculate expiry timestamp
    const expiresAt = BigInt(Math.floor(Date.now() / 1000) + daysUntilExpiry * 24 * 60 * 60)

    let txHash: Hex
    let amountWei: bigint

    try {
      if (tokenType === 'ETH') {
        // Create ETH gift
        amountWei = parseEther(amount)

        txHash = await walletClient.writeContract({
          address: DEGIFT_CONTRACT,
          abi: DeGiftAbi,
          functionName: 'createGift',
          args: [recipientAddress as Address, '0x0000000000000000000000000000000000000000' as Address, amountWei, message, expiresAt],
          value: amountWei,
        })
      } else if (tokenType === 'ERC20') {
        if (!tokenAddress) {
          throw new Error('Token address required for ERC20 gifts')
        }

        // Get token decimals
        const decimals = await publicClient.readContract({
          address: tokenAddress as Address,
          abi: ERC20Abi,
          functionName: 'decimals',
        })

        amountWei = parseUnits(amount, decimals)

        // Check allowance
        const allowance = await publicClient.readContract({
          address: tokenAddress as Address,
          abi: ERC20Abi,
          functionName: 'allowance',
          args: [account.address, DEGIFT_CONTRACT],
        })

        if (allowance < amountWei) {
          throw new Error(
            `Insufficient allowance. Current: ${allowance}, Required: ${amountWei}. Please approve tokens first.`
          )
        }

        // Create ERC20 gift
        txHash = await walletClient.writeContract({
          address: DEGIFT_CONTRACT,
          abi: DeGiftAbi,
          functionName: 'createGift',
          args: [recipientAddress as Address, tokenAddress as Address, amountWei, message, expiresAt],
        })
      } else if (tokenType === 'ERC721' || tokenType === 'ERC1155') {
        if (!tokenAddress) {
          throw new Error(`Token address required for ${tokenType} gifts`)
        }
        if (!tokenId) {
          throw new Error(`Token ID required for ${tokenType} gifts`)
        }

        amountWei = BigInt(amount)

        // Determine token type enum value (2 for ERC721, 3 for ERC1155)
        const tokenTypeEnum = tokenType === 'ERC721' ? 2 : 3

        // Create NFT gift using createNFTGift
        txHash = await walletClient.writeContract({
          address: DEGIFT_CONTRACT,
          abi: DeGiftAbi,
          functionName: 'createNFTGift',
          args: [
            recipientAddress as Address,
            tokenTypeEnum,
            tokenAddress as Address,
            BigInt(tokenId),
            amountWei,
            message,
            expiresAt,
          ],
        })
      } else {
        throw new Error(`Unsupported token type: ${tokenType}`)
      }

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      // Find GiftCreated event to get giftId
      const logs = await publicClient.getLogs({
        address: DEGIFT_CONTRACT,
        event: DeGiftAbi.find((item) => item.name === 'GiftCreated')!,
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      })

      if (logs.length === 0) {
        throw new Error('GiftCreated event not found')
      }

      const giftId = logs[0].topics[1] as Hex

      return {
        txHash,
        giftId,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      throw new Error(`Failed to create gift: ${error.message || error}`)
    }
  }

  /**
   * Get gift by ID (database)
   */
  async getGift(giftId: string) {
    const gift = await this.prisma.gift.findUnique({
      where: { giftId },
      include: {
        sender: {
          select: {
            id: true,
            address: true,
            farcasterName: true,
            farcasterFid: true,
          },
        },
        recipient: {
          select: {
            id: true,
            address: true,
            farcasterName: true,
            farcasterFid: true,
          },
        },
        claims: {
          include: {
            claimer: {
              select: {
                id: true,
                address: true,
                farcasterName: true,
                farcasterFid: true,
              },
            },
          },
        },
      },
    })

    if (!gift) {
      throw new Error('Gift not found')
    }

    return gift
  }

  /**
   * Get gifts with filters and pagination
   */
  async getGifts(params: {
    status?: string
    senderId?: string
    recipientId?: string
    recipientAddress?: string
    limit?: number
    offset?: number
    orderBy?: 'createdAt' | 'expiresAt'
    order?: 'asc' | 'desc'
  }) {
    const {
      status,
      senderId,
      recipientId,
      recipientAddress,
      limit = 20,
      offset = 0,
      orderBy = 'createdAt',
      order = 'desc',
    } = params

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (senderId) {
      where.senderId = senderId
    }

    if (recipientId) {
      where.recipientId = recipientId
    }

    if (recipientAddress) {
      where.recipientAddress = recipientAddress.toLowerCase()
    }

    const [gifts, total] = await Promise.all([
      this.prisma.gift.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              address: true,
              farcasterName: true,
              farcasterFid: true,
            },
          },
          recipient: {
            select: {
              id: true,
              address: true,
              farcasterName: true,
              farcasterFid: true,
            },
          },
        },
        orderBy: { [orderBy]: order },
        skip: offset,
        take: limit,
      }),
      this.prisma.gift.count({ where }),
    ])

    return {
      gifts,
      total,
      limit,
      offset,
      hasMore: offset + gifts.length < total,
    }
  }

  /**
   * Get gift claims
   */
  async getGiftClaims(giftId: string) {
    const gift = await this.prisma.gift.findUnique({
      where: { giftId },
    })

    if (!gift) {
      throw new Error('Gift not found')
    }

    const claims = await this.prisma.giftClaim.findMany({
      where: { giftId: gift.id },
      include: {
        claimer: {
          select: {
            id: true,
            address: true,
            farcasterName: true,
            farcasterFid: true,
          },
        },
      },
      orderBy: { claimedAt: 'desc' },
    })

    return claims
  }

  /**
   * Check if user can claim a gift
   */
  async canClaim(giftId: string, userAddress: string): Promise<{ canClaim: boolean; reason?: string }> {
    const gift = await this.prisma.gift.findUnique({
      where: { giftId },
    })

    if (!gift) {
      return { canClaim: false, reason: 'Gift not found' }
    }

    // Check if already claimed
    if (gift.status === 'CLAIMED') {
      return { canClaim: false, reason: 'Gift already claimed' }
    }

    // Check if refunded
    if (gift.status === 'REFUNDED') {
      return { canClaim: false, reason: 'Gift was refunded' }
    }

    // Check if expired
    if (gift.status === 'EXPIRED' || gift.expiresAt < new Date()) {
      return { canClaim: false, reason: 'Gift has expired' }
    }

    // Check if user is recipient
    if (gift.recipientAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return { canClaim: false, reason: 'You are not the recipient' }
    }

    return { canClaim: true }
  }

  /**
   * Mark expired gifts
   * This should be called periodically
   */
  async markExpiredGifts() {
    const now = new Date()

    const result = await this.prisma.gift.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    })

    return result.count
  }

  /**
   * Get gifts sent by user
   */
  async getUserSentGifts(address: string, params: GetUserGiftsParams = {}) {
    const { page = 1, limit = 20, status, sortBy = 'createdAt', order = 'desc' } = params

    // Find user by address
    const user = await this.prisma.user.findUnique({
      where: { address: address.toLowerCase() },
    })

    if (!user) {
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          hasMore: false,
        },
      }
    }

    // Build where clause
    const where: any = {
      senderId: user.id,
    }

    if (status) {
      where.status = status
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Query gifts
    const [gifts, total] = await Promise.all([
      this.prisma.gift.findMany({
        where,
        include: {
          recipient: {
            select: {
              id: true,
              address: true,
              farcasterName: true,
              farcasterFid: true,
            },
          },
        },
        orderBy: { [sortBy]: order },
        skip: offset,
        take: limit,
      }),
      this.prisma.gift.count({ where }),
    ])

    return {
      data: gifts,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + gifts.length < total,
      },
    }
  }

  /**
   * Get gifts received by user
   */
  async getUserReceivedGifts(address: string, params: GetUserGiftsParams = {}) {
    const { page = 1, limit = 20, status, sortBy = 'createdAt', order = 'desc' } = params

    // Build where clause
    const where: any = {
      recipientAddress: address.toLowerCase(),
    }

    if (status) {
      where.status = status
    }

    // Calculate pagination
    const offset = (page - 1) * limit

    // Query gifts
    const [gifts, total] = await Promise.all([
      this.prisma.gift.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              address: true,
              farcasterName: true,
              farcasterFid: true,
            },
          },
        },
        orderBy: { [sortBy]: order },
        skip: offset,
        take: limit,
      }),
      this.prisma.gift.count({ where }),
    ])

    return {
      data: gifts,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + gifts.length < total,
      },
    }
  }

  /**
   * Record gift claim
   */
  async recordClaim(giftId: string, userId: string, claimData: RecordClaimParams) {
    const { txHash, gasUsed, gasPrice } = claimData

    // Verify gift exists
    const gift = await this.prisma.gift.findUnique({
      where: { giftId },
    })

    if (!gift) {
      throw new Error('Gift not found')
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check if user is recipient
    if (gift.recipientAddress.toLowerCase() !== user.address.toLowerCase()) {
      throw new Error('User is not the recipient of this gift')
    }

    // Check if gift is already claimed
    if (gift.status === 'CLAIMED') {
      throw new Error('Gift already claimed')
    }

    // Check if gift is refunded
    if (gift.status === 'REFUNDED') {
      throw new Error('Gift was refunded')
    }

    // Check if gift is expired
    if (gift.status === 'EXPIRED' || gift.expiresAt < new Date()) {
      throw new Error('Gift has expired')
    }

    // Update gift and create claim record in transaction
    const now = new Date()

    const result = await this.prisma.$transaction(async (tx) => {
      // Update gift status
      const updatedGift = await tx.gift.update({
        where: { id: gift.id },
        data: {
          status: 'CLAIMED',
          claimedAt: now,
          recipientId: user.id,
        },
      })

      // Create claim record
      const claim = await tx.giftClaim.create({
        data: {
          giftId: gift.id,
          claimerId: user.id,
          amount: gift.amount,
          txHash,
          chainId: gift.chainId,
          gasUsed: gasUsed || '0',
          gasPrice: gasPrice || '0',
          claimedAt: now,
        },
      })

      return { gift: updatedGift, claim }
    })

    return {
      success: true,
      data: {
        giftId: result.gift.giftId,
        status: result.gift.status,
        claimedAt: result.gift.claimedAt,
        claimTxHash: txHash,
      },
    }
  }

  /**
   * Get global statistics
   */
  async getGlobalStats() {
    // Get gift counts by status
    const [totalGifts, statusCounts, totalUsers, stats24h] = await Promise.all([
      // Total gifts
      this.prisma.gift.count(),

      // Status counts
      this.prisma.gift.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),

      // Total users
      this.prisma.user.count(),

      // 24h stats
      (async () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const [giftsCreated, giftsClaimed] = await Promise.all([
          this.prisma.gift.count({
            where: {
              createdAt: {
                gte: yesterday,
              },
            },
          }),
          this.prisma.gift.count({
            where: {
              claimedAt: {
                gte: yesterday,
              },
            },
          }),
        ])

        return { giftsCreated, giftsClaimed }
      })(),
    ])

    // Parse status counts
    const statusMap: Record<string, number> = {}
    for (const item of statusCounts) {
      statusMap[item.status] = item._count.status
    }

    // Calculate total ETH value (only for ETH gifts)
    const ethGifts = await this.prisma.gift.findMany({
      where: {
        tokenType: 'ETH',
      },
      select: {
        amount: true,
      },
    })

    let totalValueWei = BigInt(0)
    for (const gift of ethGifts) {
      totalValueWei += BigInt(gift.amount)
    }

    // Convert to ETH (18 decimals)
    const totalValueETH = Number(totalValueWei) / 1e18

    return {
      data: {
        totalGifts,
        totalClaimed: statusMap['CLAIMED'] || 0,
        totalRefunded: statusMap['REFUNDED'] || 0,
        totalPending: statusMap['PENDING'] || 0,
        totalExpired: statusMap['EXPIRED'] || 0,
        totalValueETH: totalValueETH.toFixed(4),
        totalUsers,
        stats24h,
      },
    }
  }

  /**
   * Refund an expired gift
   */
  async refundGift(giftId: string) {
    // Validate environment
    const RPC_URL = process.env.ETHEREUM_RPC_URL
    const PRIVATE_KEY = process.env.PROXY_WALLET_PRIVATE_KEY
    const DEGIFT_CONTRACT = process.env.DEGIFT_CONTRACT_ADDRESS as Address

    if (!RPC_URL || !PRIVATE_KEY || !DEGIFT_CONTRACT) {
      throw new Error('Missing blockchain configuration')
    }

    // Setup clients
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(RPC_URL),
    })

    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(RPC_URL),
    })

    try {
      // Call contract refundGift function
      const txHash = await walletClient.writeContract({
        address: DEGIFT_CONTRACT,
        abi: DeGiftAbi,
        functionName: 'refundGift',
        args: [BigInt(giftId)],
      })

      // Wait for transaction
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      if (receipt.status !== 'success') {
        throw new Error('Transaction failed')
      }

      return {
        txHash,
        blockNumber: receipt.blockNumber,
      }
    } catch (error: any) {
      throw new Error(`Failed to refund gift: ${error.message || error}`)
    }
  }
}
