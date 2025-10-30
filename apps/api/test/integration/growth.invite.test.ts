// @ts-nocheck
import request from 'supertest'
import { buildApp } from '../../src/app'

describe('Growth invite endpoints', () => {
  it('accept and stats', async () => {
    const app = await buildApp({ withJobs: false, withSocket: false })

    // mock prisma
    const users = new Map<string, any>([["code123", { id: 'inviter', inviteCode: 'code123' }]])
    const invitations: any[] = []
    ;(app as any).prisma = {
      user: {
        findUnique: async ({ where: { inviteCode } }: any) => users.get(inviteCode) || null,
      },
      invitation: {
        upsert: async ({ where, create }: any) => {
          const exists = invitations.find((x) => x.inviterId === where.inviterId_inviteeId.inviterId && x.inviteeId === where.inviterId_inviteeId.inviteeId)
          if (!exists) invitations.push(create)
          return create
        },
        count: async ({ where: { inviterId } }: any) => invitations.filter((x) => x.inviterId === inviterId).length,
      },
    }

    const token = (app as any).jwt.sign({ userId: 'invitee', address: '0xaddr' })

    const res1 = await request(app.server)
      .post('/api/invite/accept')
      .set('authorization', `Bearer ${token}`)
      .send({ inviterCode: 'code123' })
    expect(res1.status).toBe(200)

    const res2 = await request(app.server)
      .get('/api/invite/stats')
      .set('authorization', `Bearer ${token}`)
    expect(res2.status).toBe(200)
    expect(res2.body.total).toBeDefined()

    await app.close()
  })
})


