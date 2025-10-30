import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ensureIdempotency } from '../utils/idempotency'
import { createPacketRecord, claimPacketRecord } from '../services/packet.service'
import { withLock } from '../utils/locks'

const createSchema = z.object({
  packetId: z.string(),
  txHash: z.string(),
  token: z.string(),
  totalAmount: z.string().regex(/^\d+$/),
  count: z.number().int().min(1).max(200),
  isRandom: z.boolean(),
  message: z.string().max(200).optional(),
  expireTime: z.string().datetime(),
})

const claimSchema = z.object({
  packetId: z.string(),
})

const plugin: FastifyPluginAsync = async (app) => {
  app.post('/api/packets/create', { preHandler: [app.authenticate as any] }, async (req: any, reply) => {
    await ensureIdempotency(req, reply)
    if (reply.sent) return
    const input = createSchema.parse(req.body)
    // 占位实现：仅入库记录（假设链上已确认）
    const packet = await createPacketRecord(app.prisma, req.user.userId, {
      ...input,
      expireTime: new Date(input.expireTime),
    })
    return { packet }
  })

  app.post('/api/packets/claim', {
    preHandler: [app.authenticate as any],
    config: { rateLimit: { max: 10, timeWindow: '10s' } },
  }, async (req: any, reply) => {
    await ensureIdempotency(req, reply)
    if (reply.sent) return
    const { packetId } = claimSchema.parse(req.body)
    const result = await withLock(app.redis, `claim:${packetId}:${req.user.userId}`, 10, async () => {
      return await claimPacketRecord(app.prisma, packetId, req.user.userId)
    })
    if ('error' in result) {
      const map: any = { PACKET_NOT_FOUND: 404, PACKET_EXPIRED: 400, PACKET_ALREADY_CLAIMED: 409 }
      return reply.code(map[result.error] || 400).send({ error: result.error })
    }
    return { claim: result.claim }
  })

  app.get('/api/packets/:packetId', async (req, reply) => {
    const { packetId } = z.object({ packetId: z.string() }).parse(req.params)
    const packet = await app.prisma.packet.findUnique({ where: { packetId } })
    if (!packet) return reply.code(404).send({ error: 'PACKET_NOT_FOUND' })
    return { packet }
  })

  app.get('/api/packets/:packetId/claims', async (req, reply) => {
    const { packetId } = z.object({ packetId: z.string() }).parse(req.params)
    const packet = await app.prisma.packet.findUnique({ where: { packetId } })
    if (!packet) return reply.code(404).send({ error: 'PACKET_NOT_FOUND' })
    const claims = await app.prisma.claim.findMany({ where: { packetId: packet.id }, orderBy: { claimedAt: 'desc' } })
    return { claims }
  })
}

export default plugin


