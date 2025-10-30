import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import jwtPlugin from './plugins/jwt'
import socketPlugin from './plugins/socket'
import authRoutes from './routes/auth'
import packetRoutes from './routes/packets'
import inviteRoutes from './routes/growth/invite'
import leaderboardRoutes from './routes/growth/leaderboard'
import { startSyncPacketsJob } from './jobs/syncPackets.job'
import { startRebuildLeaderboardJob } from './jobs/rebuildLeaderboard.job'

export async function buildApp(options?: { withJobs?: boolean; withSocket?: boolean }) {
  const app = Fastify({ logger: false })

  await app.register(cors, { origin: true, credentials: true })
  await app.register(rateLimit, { max: Number(process.env.RATE_LIMIT_MAX ?? 120), timeWindow: process.env.RATE_LIMIT_WINDOW_MS ?? '1 minute' })
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(jwtPlugin)
  if (options?.withSocket !== false) {
    await app.register(socketPlugin)
  }

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes)
  await app.register(packetRoutes)
  await app.register(inviteRoutes)
  await app.register(leaderboardRoutes)

  if (options?.withJobs) {
    await startSyncPacketsJob(app)
    await startRebuildLeaderboardJob(app)
  }

  return app
}


