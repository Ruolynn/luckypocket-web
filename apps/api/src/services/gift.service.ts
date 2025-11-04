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
  tokenType: 'ETH' | 'ERC20'
  tokenAddress?: string
  amount: string
  daysUntilExpiry: number
  message?: string
  senderAddress: string
}

export interface ClaimGiftParams {
  giftId: string
  claimerAddress: string
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
          functionName: 'createGiftETH',
          args: [recipientAddress as Address, expiresAt, message],
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
          functionName: 'createGiftERC20',
          args: [recipientAddress as Address, tokenAddress as Address, amountWei, expiresAt, message],
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
}
