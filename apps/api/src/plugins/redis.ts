import fp from 'fastify-plugin'
import IORedis from 'ioredis'

declare module 'fastify' {
  interface FastifyInstance {
    redis: IORedis.Redis
  }
}

export default fp(async (app) => {
  const url = process.env.REDIS_URL
  const client = new IORedis(url || 'redis://127.0.0.1:6379')

  app.addHook('onClose', async () => {
    try {
      await client.quit()
    } catch {}
  })

  app.decorate('redis', client)
})


