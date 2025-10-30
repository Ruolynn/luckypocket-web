import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const plugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate as any)

  app.post('/api/invite/accept', async (req: any, reply) => {
    const { inviterCode } = z.object({ inviterCode: z.string() }).parse(req.body)
    const inviter = await app.prisma.user.findUnique({ where: { inviteCode: inviterCode } })
    if (!inviter || inviter.id === req.user.userId) {
      return reply.code(400).send({ error: 'INVALID_INVITER_CODE' })
    }
    await app.prisma.invitation.upsert({
      where: { inviterId_inviteeId: { inviterId: inviter.id, inviteeId: req.user.userId } } as any,
      update: {},
      create: { inviterId: inviter.id, inviteeId: req.user.userId },
    })
    return { success: true }
  })

  app.get('/api/invite/stats', async (req: any) => {
    const userId = req.user.userId
    const total = await app.prisma.invitation.count({ where: { inviterId: userId } })
    return { total }
  })
}

export default plugin


