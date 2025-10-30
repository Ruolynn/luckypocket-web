import type { FastifyInstance } from 'fastify'
import { getPublicClient, getContractAddress, topics } from '../services/chain.service'

const REDIS_LAST_BLOCK_KEY = 'sync:lastBlock'

export async function startSyncPacketsJob(app: FastifyInstance) {
  const client = getPublicClient()
  const address = getContractAddress()

  async function tick() {
    try {
      const latest = await client.getBlockNumber()
      const stored = await app.redis.get(REDIS_LAST_BLOCK_KEY)
      const from = stored ? BigInt(stored) + 1n : latest > 1000n ? latest - 1000n : 0n

      // PacketCreated
      const createdLogs = await client.getLogs({
        address,
        event: topics.PacketCreated,
        fromBlock: from,
        toBlock: latest,
      })
      for (const log of createdLogs) {
        const pid = log.args.packetId as `0x${string}`
        const txHash = log.transactionHash as `0x${string}`
        const expire = Number(log.args.expireTime)
        // 仅更新已存在记录的附加信息，避免外部创建导致缺失 creatorId 外键
        await app.prisma.packet.updateMany({
          where: { packetId: pid },
          data: {
            txHash,
            token: (log.args.token as string).toLowerCase(),
            totalAmount: (log.args.totalAmount as bigint).toString(),
            count: Number(log.args.count),
            isRandom: Boolean(log.args.isRandom),
            expireTime: new Date(expire * 1000),
          },
        })
        // WS 广播
        app.io.to(`packet:${pid}`).emit('packet:created', {
          packetId: pid,
          creator: log.args.creator,
          totalAmount: (log.args.totalAmount as bigint).toString(),
          count: Number(log.args.count),
        })
      }

      // PacketClaimed
      const claimedLogs = await client.getLogs({
        address,
        event: topics.PacketClaimed,
        fromBlock: from,
        toBlock: latest,
      })
      for (const log of claimedLogs) {
        const pid = log.args.packetId as `0x${string}`
        const claimer = (log.args.claimer as string).toLowerCase()
        const amount = (log.args.amount as bigint).toString()

        const packet = await app.prisma.packet.findUnique({ where: { packetId: pid } })
        if (!packet) continue

        const user = await app.prisma.user.upsert({
          where: { address: claimer },
          update: {},
          create: { address: claimer },
          select: { id: true },
        })

        await app.prisma.claim.upsert({
          where: { txHash: log.transactionHash as string },
          update: {},
          create: {
            packetId: packet.id,
            userId: user.id,
            amount,
            txHash: log.transactionHash as string,
          },
        })

        // WS 广播
        app.io.to(`packet:${pid}`).emit('packet:claimed', {
          packetId: pid,
          claimer,
          amount,
          remainingCount: Number(log.args.remainingCount),
        })
      }

      await app.redis.set(REDIS_LAST_BLOCK_KEY, latest.toString())
    } catch (err) {
      app.log.error({ err }, 'syncPackets tick error')
    }
  }

  // 立即执行一次，然后按 30s 周期轮询
  tick()
  const intervalMs = Number(process.env.SYNC_INTERVAL_MS || 30000)
  const timer = setInterval(tick, intervalMs)
  app.addHook('onClose', async () => clearInterval(timer))
}


