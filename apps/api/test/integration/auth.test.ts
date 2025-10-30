import request from 'supertest'
import { buildApp } from '../../src/app'

describe('Auth SIWE', () => {
  it('GET /api/auth/siwe/nonce should return nonce', async () => {
    const app = await buildApp({ withJobs: false, withSocket: false })
    const res = await request(app.server).get('/api/auth/siwe/nonce')
    expect(res.status).toBe(200)
    expect(res.body.nonce).toBeDefined()
    await app.close()
  })
})


