/**
 * @file Event Listener Service
 * @description Listen to DeGift contract events and sync to database
 */

import type { PrismaClient } from '@prisma/client'
import {
  createPublicClient,
  http,
  type Address,
  type Hex,
  type Log,
  type WatchContractEventReturnType,
} from 'viem'
import { sepolia } from 'viem/chains'
import { DeGiftAbi } from '../abi/DeGift'
import { TokenType, GiftStatus } from '@prisma/client'

export interface EventListenerConfig {
  rpcUrl: string
  contractAddress: Address
  chainId: number
  pollingInterval?: number
}

export class EventListenerService {
  private client: ReturnType<typeof createPublicClient>
  private config: EventListenerConfig
  private prisma: PrismaClient
  private unwatchFunctions: WatchContractEventReturnType[] = []
  private isListening = false

  constructor(config: EventListenerConfig, prisma: PrismaClient) {
    this.config = config
    this.prisma = prisma

    this.client = createPublicClient({
      chain: sepolia,
      transport: http(config.rpcUrl),
      pollingInterval: config.pollingInterval || 4_000, // 4 seconds
    })
  }

  /**
   * Start listening to contract events
   */
  async start() {
    if (this.isListening) {
      console.log('⚠️  Event listener already running')
      return
    }

    console.log('\n🎧 Starting event listener...')
    console.log(`   Contract: ${this.config.contractAddress}`)
    console.log(`   Chain ID: ${this.config.chainId}`)
    console.log(`   Polling interval: ${this.config.pollingInterval || 4000}ms\n`)

    try {
      // Listen to GiftCreated events
      const unwatchCreated = this.client.watchContractEvent({
        address: this.config.contractAddress,
        abi: DeGiftAbi,
        eventName: 'GiftCreated',
        onLogs: (logs) => this.handleGiftCreatedLogs(logs),
        onError: (error) => console.error('GiftCreated watch error:', error),
        pollingInterval: this.config.pollingInterval,
      })

      // Listen to GiftClaimed events
      const unwatchClaimed = this.client.watchContractEvent({
        address: this.config.contractAddress,
        abi: DeGiftAbi,
        eventName: 'GiftClaimed',
        onLogs: (logs) => this.handleGiftClaimedLogs(logs),
        onError: (error) => console.error('GiftClaimed watch error:', error),
        pollingInterval: this.config.pollingInterval,
      })

      // Listen to GiftRefunded events
      const unwatchRefunded = this.client.watchContractEvent({
        address: this.config.contractAddress,
        abi: DeGiftAbi,
        eventName: 'GiftRefunded',
        onLogs: (logs) => this.handleGiftRefundedLogs(logs),
        onError: (error) => console.error('GiftRefunded watch error:', error),
        pollingInterval: this.config.pollingInterval,
      })

      this.unwatchFunctions = [unwatchCreated, unwatchClaimed, unwatchRefunded]
      this.isListening = true

      console.log('✅ Event listener started successfully')
      console.log('   Listening for: GiftCreated, GiftClaimed, GiftRefunded\n')
    } catch (error) {
      console.error('❌ Failed to start event listener:', error)
      throw error
    }
  }

  /**
   * Stop listening to events
   */
  async stop() {
    if (!this.isListening) {
      console.log('⚠️  Event listener not running')
      return
    }

    console.log('\n🛑 Stopping event listener...')

    // Unwatch all events
    this.unwatchFunctions.forEach((unwatch) => unwatch())
    this.unwatchFunctions = []
    this.isListening = false

    console.log('✅ Event listener stopped\n')
  }

  /**
   * Handle GiftCreated events
   */
  private async handleGiftCreatedLogs(logs: Log[]) {
    for (const log of logs) {
      try {
        // Parse event args
        const { args, transactionHash, blockNumber } = log as any

        const {
          giftId,
          sender,
          recipient,
          tokenType,
          token,
          tokenId,
          amount,
          expiresAt,
          message,
        } = args

        console.log(`\n🎁 GiftCreated event detected`)
        console.log(`   Gift ID: ${giftId}`)
        console.log(`   Tx: ${transactionHash}`)
        console.log(`   Block: ${blockNumber}`)

        // Map tokenType to enum
        const tokenTypeEnum = this.mapTokenType(tokenType)

        // Get token metadata
        const metadata = await this.fetchTokenMetadata(token, tokenId, tokenTypeEnum)

        // Calculate expiry date
        const expiresAtDate = new Date(Number(expiresAt) * 1000)

        // Get or create sender user
        const senderUser = await this.getOrCreateUser(sender)

        // Get or create recipient user (if not zero address)
        let recipientUser = null
        if (recipient !== '0x0000000000000000000000000000000000000000') {
          recipientUser = await this.getOrCreateUser(recipient)
        }

        // Create gift record in database
        await this.prisma.gift.create({
          data: {
            giftId: giftId as string,
            chainId: this.config.chainId,
            createTxHash: transactionHash as string,
            senderId: senderUser.id,
            recipientAddress: (recipient as string).toLowerCase(),
            recipientId: recipientUser?.id,
            tokenType: tokenTypeEnum,
            token: (token as string).toLowerCase(),
            tokenId: (tokenId as bigint).toString(),
            amount: (amount as bigint).toString(),
            tokenSymbol: metadata.symbol,
            tokenDecimals: metadata.decimals,
            tokenName: metadata.name,
            tokenImage: metadata.image,
            message: message as string,
            status: GiftStatus.PENDING,
            expiresAt: expiresAtDate,
          },
        })

        console.log(`   ✅ Gift saved to database`)
      } catch (error: any) {
        console.error(`   ❌ Failed to handle GiftCreated event:`, error.message || error)
      }
    }
  }

  /**
   * Handle GiftClaimed events
   */
  private async handleGiftClaimedLogs(logs: Log[]) {
    for (const log of logs) {
      try {
        const { args, transactionHash, blockNumber } = log as any
        const { giftId, recipient, amount } = args

        console.log(`\n🎉 GiftClaimed event detected`)
        console.log(`   Gift ID: ${giftId}`)
        console.log(`   Tx: ${transactionHash}`)
        console.log(`   Block: ${blockNumber}`)

        // Find gift in database
        const gift = await this.prisma.gift.findUnique({
          where: { giftId: giftId as string },
        })

        if (!gift) {
          console.error(`   ❌ Gift not found in database: ${giftId}`)
          continue
        }

        // Get or create claimer user
        const claimerUser = await this.getOrCreateUser(recipient)

        // Update gift status
        await this.prisma.$transaction([
          // Update gift
          this.prisma.gift.update({
            where: { id: gift.id },
            data: {
              status: GiftStatus.CLAIMED,
              claimTxHash: transactionHash as string,
              claimedAt: new Date(),
            },
          }),
          // Create claim record
          this.prisma.giftClaim.create({
            data: {
              giftId: gift.id,
              claimerId: claimerUser.id,
              amount: (amount as bigint).toString(),
              txHash: transactionHash as string,
              chainId: this.config.chainId,
            },
          }),
        ])

        console.log(`   ✅ Gift claim saved to database`)
      } catch (error: any) {
        console.error(`   ❌ Failed to handle GiftClaimed event:`, error.message || error)
      }
    }
  }

  /**
   * Handle GiftRefunded events
   */
  private async handleGiftRefundedLogs(logs: Log[]) {
    for (const log of logs) {
      try {
        const { args, transactionHash, blockNumber } = log as any
        const { giftId, sender, amount } = args

        console.log(`\n💸 GiftRefunded event detected`)
        console.log(`   Gift ID: ${giftId}`)
        console.log(`   Tx: ${transactionHash}`)
        console.log(`   Block: ${blockNumber}`)

        // Find gift in database
        const gift = await this.prisma.gift.findUnique({
          where: { giftId: giftId as string },
        })

        if (!gift) {
          console.error(`   ❌ Gift not found in database: ${giftId}`)
          continue
        }

        // Update gift status
        await this.prisma.gift.update({
          where: { id: gift.id },
          data: {
            status: GiftStatus.REFUNDED,
            refundTxHash: transactionHash as string,
            refundedAt: new Date(),
          },
        })

        console.log(`   ✅ Gift refund saved to database`)
      } catch (error: any) {
        console.error(`   ❌ Failed to handle GiftRefunded event:`, error.message || error)
      }
    }
  }

  /**
   * Map contract token type to Prisma enum
   */
  private mapTokenType(contractType: number): TokenType {
    switch (contractType) {
      case 0:
        return TokenType.ETH
      case 1:
        return TokenType.ERC20
      case 2:
        return TokenType.ERC721
      case 3:
        return TokenType.ERC1155
      default:
        throw new Error(`Unknown token type: ${contractType}`)
    }
  }

  /**
   * Get or create user by address
   */
  private async getOrCreateUser(address: Address) {
    const normalizedAddress = address.toLowerCase()

    const user = await this.prisma.user.upsert({
      where: { address: normalizedAddress },
      update: {},
      create: { address: normalizedAddress },
    })

    return user
  }

  /**
   * Fetch token metadata
   */
  private async fetchTokenMetadata(
    tokenAddress: Address,
    tokenId: bigint,
    tokenType: TokenType
  ): Promise<{
    symbol: string | null
    decimals: number | null
    name: string | null
    image: string | null
  }> {
    try {
      // ETH
      if (tokenType === TokenType.ETH) {
        return {
          symbol: 'ETH',
          decimals: 18,
          name: 'Ethereum',
          image: null,
        }
      }

      // ERC20
      if (tokenType === TokenType.ERC20) {
        const [symbol, decimals, name] = await Promise.all([
          this.client
            .readContract({
              address: tokenAddress,
              abi: [
                {
                  name: 'symbol',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [],
                  outputs: [{ type: 'string' }],
                },
              ],
              functionName: 'symbol',
            })
            .catch(() => null),
          this.client
            .readContract({
              address: tokenAddress,
              abi: [
                {
                  name: 'decimals',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [],
                  outputs: [{ type: 'uint8' }],
                },
              ],
              functionName: 'decimals',
            })
            .catch(() => null),
          this.client
            .readContract({
              address: tokenAddress,
              abi: [
                {
                  name: 'name',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [],
                  outputs: [{ type: 'string' }],
                },
              ],
              functionName: 'name',
            })
            .catch(() => null),
        ])

        return {
          symbol: symbol as string | null,
          decimals: decimals ? Number(decimals) : null,
          name: name as string | null,
          image: null,
        }
      }

      // ERC721 / ERC1155 - Would need to fetch metadata from tokenURI
      // For now, return basic info
      return {
        symbol: null,
        decimals: null,
        name: null,
        image: null,
      }
    } catch (error) {
      console.error(`Failed to fetch token metadata for ${tokenAddress}:`, error)
      return {
        symbol: null,
        decimals: null,
        name: null,
        image: null,
      }
    }
  }

  /**
   * Sync historical events from a specific block
   */
  async syncFromBlock(fromBlock: bigint, toBlock?: bigint) {
    console.log(`\n📜 Syncing historical events...`)
    console.log(`   From block: ${fromBlock}`)
    console.log(`   To block: ${toBlock || 'latest'}\n`)

    try {
      // Fetch all GiftCreated events
      const createdLogs = await this.client.getLogs({
        address: this.config.contractAddress,
        event: DeGiftAbi.find((item) => item.name === 'GiftCreated')!,
        fromBlock,
        toBlock: toBlock || 'latest',
      })

      console.log(`Found ${createdLogs.length} GiftCreated events`)
      await this.handleGiftCreatedLogs(createdLogs as any)

      // Fetch all GiftClaimed events
      const claimedLogs = await this.client.getLogs({
        address: this.config.contractAddress,
        event: DeGiftAbi.find((item) => item.name === 'GiftClaimed')!,
        fromBlock,
        toBlock: toBlock || 'latest',
      })

      console.log(`Found ${claimedLogs.length} GiftClaimed events`)
      await this.handleGiftClaimedLogs(claimedLogs as any)

      // Fetch all GiftRefunded events
      const refundedLogs = await this.client.getLogs({
        address: this.config.contractAddress,
        event: DeGiftAbi.find((item) => item.name === 'GiftRefunded')!,
        fromBlock,
        toBlock: toBlock || 'latest',
      })

      console.log(`Found ${refundedLogs.length} GiftRefunded events`)
      await this.handleGiftRefundedLogs(refundedLogs as any)

      console.log(`\n✅ Historical sync completed\n`)
    } catch (error) {
      console.error(`❌ Historical sync failed:`, error)
      throw error
    }
  }
}
