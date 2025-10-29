import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'

const app = Fastify({ logger: true })

// Plugins
await app.register(cors, { origin: true, credentials: true })
await app.register(rateLimit, { max: Number(process.env.RATE_LIMIT_MAX ?? 120), timeWindow: process.env.RATE_LIMIT_WINDOW_MS ?? '1 minute' })
await app.register(jwt, { secret: process.env.JWT_SECRET || 'replace-me' })

// Health
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// Start
const port = Number(process.env.PORT || 3001)
app
  .listen({ port, host: '0.0.0.0' })
  .then(() => app.log.info(`API listening on :${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
