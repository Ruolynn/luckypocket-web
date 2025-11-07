/**
 * @file Sync Gifts Job
 * @description Job to sync gift and packet events from blockchain
 */

import type { FastifyInstance } from 'fastify'
import { EventListenerService } from '../services/event-listener.service'
import { RedPacketListenerService } from '../services/redpacket-listener.service'
import { ReorgDetectionService } from '../services/reorg-detection.service'
import type { Address } from 'viem'

let eventListener: EventListenerService | null = null
let redPacketListener: RedPacketListenerService | null = null
let reorgDetector: ReorgDetectionService | null = null

/**
 * Start the gift sync job
 */
export async function startSyncGiftsJob(app: FastifyInstance) {
  if (process.env.LOADTEST_MODE === 'true') {
    app.log.info('⏭️  Loadtest mode enabled, skipping gift sync job')
    return
  }

  const RPC_URL = process.env.ETHEREUM_RPC_URL
  const DEGIFT_CONTRACT = process.env.DEGIFT_CONTRACT_ADDRESS as Address
  const REDPACKET_CONTRACT = process.env.REDPACKET_CONTRACT_ADDRESS as Address
  const CHAIN_ID = 11155111 // Sepolia

  if (!RPC_URL) {
    app.log.warn('⚠️  Skipping sync job: Missing ETHEREUM_RPC_URL')
    return
  }

  try {
    app.log.info('🚀 Initializing blockchain sync job...')

    // Start DeGift listener if contract address is configured
    if (DEGIFT_CONTRACT) {
      app.log.info('🎁 Starting DeGift event listener...')
      eventListener = new EventListenerService(
        {
          rpcUrl: RPC_URL,
          contractAddress: DEGIFT_CONTRACT,
          chainId: CHAIN_ID,
          pollingInterval: 4_000, // 4 seconds
        },
        app.prisma,
        app.io // Pass Socket.IO server for real-time events
      )

      // Optional: Sync historical events from a specific block
      const SYNC_FROM_BLOCK = process.env.SYNC_FROM_BLOCK
      if (SYNC_FROM_BLOCK) {
        app.log.info(`📜 Syncing DeGift historical events from block ${SYNC_FROM_BLOCK}...`)
        await eventListener.syncFromBlock(BigInt(SYNC_FROM_BLOCK))
      }

      await eventListener.start()
      app.log.info('✅ DeGift event listener started')
    } else {
      app.log.warn('⚠️  Skipping DeGift listener: Missing DEGIFT_CONTRACT_ADDRESS')
    }

    // Start RedPacket listener if contract address is configured
    if (REDPACKET_CONTRACT) {
      app.log.info('🧧 Starting RedPacket event listener...')
      redPacketListener = new RedPacketListenerService(
        {
          rpcUrl: RPC_URL,
          contractAddress: REDPACKET_CONTRACT,
          chainId: CHAIN_ID,
          pollingInterval: 4_000, // 4 seconds
        },
        app.prisma,
        app.io // Pass Socket.IO server for real-time events
      )

      // Optional: Sync historical RedPacket events from a specific block
      const SYNC_REDPACKET_FROM_BLOCK = process.env.SYNC_REDPACKET_FROM_BLOCK
      if (SYNC_REDPACKET_FROM_BLOCK) {
        app.log.info(`📜 Syncing RedPacket historical events from block ${SYNC_REDPACKET_FROM_BLOCK}...`)
        await redPacketListener.syncFromBlock(BigInt(SYNC_REDPACKET_FROM_BLOCK))
      }

      await redPacketListener.start()
      app.log.info('✅ RedPacket event listener started')
    } else {
      app.log.warn('⚠️  Skipping RedPacket listener: Missing REDPACKET_CONTRACT_ADDRESS')
    }

    // Start reorg detection service if RedPacket listener is enabled
    if (REDPACKET_CONTRACT) {
      app.log.info('🔍 Starting reorg detection service...')
      reorgDetector = new ReorgDetectionService(
        {
          rpcUrl: RPC_URL,
          chainId: CHAIN_ID,
          checkDepth: 12, // Check last 12 blocks (~3 minutes on Sepolia)
          checkInterval: 60_000, // Check every minute
        },
        app.prisma
      )

      await reorgDetector.start()
      app.log.info('✅ Reorg detection service started')
    }

    app.log.info('✅ Blockchain sync job started successfully')
  } catch (error) {
    app.log.error({ error }, '❌ Failed to start blockchain sync job')
    throw error
  }
}

/**
 * Stop the blockchain sync job
 */
export async function stopSyncGiftsJob() {
  if (eventListener) {
    await eventListener.stop()
    eventListener = null
  }
  if (redPacketListener) {
    await redPacketListener.stop()
    redPacketListener = null
  }
  if (reorgDetector) {
    await reorgDetector.stop()
    reorgDetector = null
  }
}

/**
 * Get service instances (for testing/debugging)
 */
export function getEventListener() {
  return eventListener
}

export function getRedPacketListener() {
  return redPacketListener
}

export function getReorgDetector() {
  return reorgDetector
}
