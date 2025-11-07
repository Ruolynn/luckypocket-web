import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import sentryPlugin from './plugins/sentry'
import prismaPlugin from './plugins/prisma'
import redisPlugin from './plugins/redis'
import jwtPlugin from './plugins/jwt'
import socketPlugin from './plugins/socket'
import chainPlugin from './plugins/chain'
import invitePlugin from './plugins/invite'
import achievementPlugin from './plugins/achievement'
import authRoutes from './routes/auth'
import giftsRoutes from './routes/gifts'
import usersRoutes from './routes/users'
import statsRoutes from './routes/stats'
import inviteRoutes from './routes/growth/invite'
import leaderboardRoutes from './routes/growth/leaderboard'
import achievementRoutes from './routes/growth/achievement'
import frameRoutes from './routes/frame'
import linearRoutes from './routes/linear'
import { startRebuildLeaderboardJob } from './jobs/rebuildLeaderboard.job'
import { startSyncGiftsJob } from './jobs/syncGifts.job'

export async function buildApp(options?: { withJobs?: boolean; withSocket?: boolean }) {
  const app = Fastify({ logger: false })

  await app.register(cors, { origin: true, credentials: true })
  await app.register(sentryPlugin)
  // 在测试环境或压力测试时禁用 rateLimit
  // 压力测试时通过 DISABLE_RATE_LIMIT 环境变量禁用
  if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_RATE_LIMIT !== 'true') {
    await app.register(rateLimit, {
      max: Number(process.env.RATE_LIMIT_MAX ?? 120),
      timeWindow: (process.env.RATE_LIMIT_WINDOW_MS as any) ?? '1 minute',
    })
  }
  await app.register(prismaPlugin)
  await app.register(redisPlugin)
  await app.register(jwtPlugin)
  await app.register(chainPlugin)
  await app.register(invitePlugin)
  await app.register(achievementPlugin)
  if (options?.withSocket !== false) {
    await app.register(socketPlugin)
  }

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes)
  await app.register(giftsRoutes)
  await app.register(usersRoutes)
  await app.register(statsRoutes)
  await app.register(inviteRoutes)
  await app.register(leaderboardRoutes)
  await app.register(achievementRoutes)
  await app.register(frameRoutes)
  await app.register(linearRoutes)

  if (options?.withJobs) {
    await startRebuildLeaderboardJob(app)
    await startSyncGiftsJob(app)
  }

  return app
}


