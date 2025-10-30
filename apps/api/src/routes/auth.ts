import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { SiweMessage } from 'siwe'

const plugin: FastifyPluginAsync = async (app) => {
  app.get('/api/auth/siwe/nonce', async () => {
    const nonce = crypto.randomUUID()
    await app.redis.setex(`siwe:nonce:${nonce}`, 300, '1')
    return { nonce }
  })

  app.post('/api/auth/siwe/verify', async (req, reply) => {
    const { message, signature } = z
      .object({ message: z.string(), signature: z.string() })
      .parse(req.body)

    const msg = new SiweMessage(message)
    let fields
    try {
      fields = await msg.validate(signature)
    } catch {
      return reply.code(401).send({ error: 'SIWE_VALIDATION_FAILED' })
    }

    // 校验 domain 与 nonce
    const expectedDomain = process.env.SIWE_DOMAIN
    if (expectedDomain && fields.domain !== expectedDomain) {
      return reply.code(400).send({ error: 'INVALID_DOMAIN' })
    }
    const nonceValid = await app.redis.del(`siwe:nonce:${fields.nonce}`)
    if (nonceValid === 0) {
      return reply.code(400).send({ error: 'INVALID_NONCE' })
    }

    const address = fields.address.toLowerCase()
    const user = await app.prisma.user.upsert({
      where: { address },
      update: {},
      create: { address },
      select: { id: true, address: true },
    })
    const token = app.jwt.sign({ userId: user.id, address: user.address }, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' })
    return { token, user }
  })

  app.get('/api/auth/me', { preHandler: [app.authenticate as any] }, async (req: any) => {
    return app.prisma.user.findUnique({ where: { id: req.user.userId } })
  })
}

export default plugin


