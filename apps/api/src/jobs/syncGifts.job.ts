/**
 * @file Sync Gifts Job
 * @description Job to sync gift events from blockchain
 */

import type { FastifyInstance } from 'fastify'
import { EventListenerService } from '../services/event-listener.service'
import type { Address } from 'viem'

let eventListener: EventListenerService | null = null

/**
 * Start the gift sync job
 */
export async function startSyncGiftsJob(app: FastifyInstance) {
  const RPC_URL = process.env.ETHEREUM_RPC_URL
  const CONTRACT_ADDRESS = process.env.DEGIFT_CONTRACT_ADDRESS as Address
  const CHAIN_ID = 11155111 // Sepolia

  if (!RPC_URL || !CONTRACT_ADDRESS) {
    app.log.warn('⚠️  Skipping gift sync job: Missing ETHEREUM_RPC_URL or DEGIFT_CONTRACT_ADDRESS')
    return
  }

  try {
    app.log.info('🚀 Initializing gift sync job...')

    // Create event listener
    eventListener = new EventListenerService(
      {
        rpcUrl: RPC_URL,
        contractAddress: CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
        pollingInterval: 4_000, // 4 seconds
      },
      app.prisma
    )

    // Optional: Sync historical events from a specific block
    const SYNC_FROM_BLOCK = process.env.SYNC_FROM_BLOCK
    if (SYNC_FROM_BLOCK) {
      app.log.info(`📜 Syncing historical events from block ${SYNC_FROM_BLOCK}...`)
      await eventListener.syncFromBlock(BigInt(SYNC_FROM_BLOCK))
    }

    // Start listening for new events
    await eventListener.start()

    app.log.info('✅ Gift sync job started successfully')
  } catch (error) {
    app.log.error({ error }, '❌ Failed to start gift sync job')
    throw error
  }
}

/**
 * Stop the gift sync job
 */
export async function stopSyncGiftsJob() {
  if (eventListener) {
    await eventListener.stop()
    eventListener = null
  }
}

/**
 * Get event listener instance (for testing/debugging)
 */
export function getEventListener() {
  return eventListener
}
