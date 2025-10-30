// @ts-nocheck
import request from 'supertest'
import { buildApp } from '../../src/app'

describe('Packets query endpoints', () => {
  it('GET /api/packets/:packetId and /claims', async () => {
    const app = await buildApp({ withJobs: false, withSocket: false })

    const packet = { id: 'p1', packetId: '0xpacket' }
    const claim = { id: 'c1', packetId: 'p1', userId: 'u1', amount: '10', claimedAt: new Date() }

    ;(app as any).prisma = {
      packet: {
        findUnique: async ({ where: { packetId } }: any) => (packetId === packet.packetId ? packet : null),
      },
      claim: {
        findMany: async ({ where: { packetId } }: any) => (packetId === packet.id ? [claim] : []),
      },
    }

    const res1 = await request(app.server).get(`/api/packets/${packet.packetId}`)
    expect(res1.status).toBe(200)
    expect(res1.body.packet.packetId).toBe(packet.packetId)

    const res2 = await request(app.server).get(`/api/packets/${packet.packetId}/claims`)
    expect(res2.status).toBe(200)
    expect(Array.isArray(res2.body.claims)).toBe(true)

    await app.close()
  })
})


