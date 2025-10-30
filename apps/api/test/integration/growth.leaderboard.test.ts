// @ts-nocheck
import request from 'supertest'
import { buildApp } from '../../src/app'

class MockRedisLB {
  async zrevrange(_key: string, _start: number, _stop: number, _with: any) {
    return ['user1', '100', 'user2', '50']
  }
}

describe('Leaderboard endpoint', () => {
  it('GET /api/leaderboard returns top list', async () => {
    const app = await buildApp({ withJobs: false, withSocket: false })
    ;(app as any).redis = new MockRedisLB() as any

    const res = await request(app.server)
      .get('/api/leaderboard')
      .query({ type: 'luck', range: 'week' })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.top)).toBe(true)
    await app.close()
  })
})


