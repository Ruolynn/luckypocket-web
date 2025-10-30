import request from 'supertest'
import { buildApp } from '../../src/app'

describe('Health endpoint', () => {
  it('GET /health should return ok', async () => {
    const app = await buildApp({ withJobs: false, withSocket: false })
    const res = await request(app.server).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    await app.close()
  })
})


