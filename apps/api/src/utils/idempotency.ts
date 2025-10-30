import type { FastifyRequest, FastifyReply } from 'fastify'

export async function ensureIdempotency(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers['idempotency-key'] as string | undefined
  if (!key) return
  const redis = (req.server as any).redis as import('ioredis').Redis
  const idemKey = `idem:${key}`
  const set = await redis.set(idemKey, '1', 'EX', 60 * 60 * 24, 'NX')
  if (set !== 'OK') {
    return reply.code(409).send({ error: 'DUPLICATE_REQUEST' })
  }
}


