import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>
  }
  interface FastifyRequest {
    user?: { userId: string; address?: string }
  }
}

export default fp(async (app) => {
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'replace-me' })

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' })
    }
  })
})


