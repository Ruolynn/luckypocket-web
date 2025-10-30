import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/leaderboard', async (req, reply) => {
    const { type, range } = z
      .object({
        type: z.enum(['luck', 'generous', 'active']),
        range: z.enum(['week', 'month', 'realtime']),
      })
      .parse(req.query as any)

    const key = `lb:${type}:${range}`
    const top = await app.redis.zrevrange(key, 0, 49, 'WITHSCORES')
    return { type, range, top }
  })
}

export default plugin


