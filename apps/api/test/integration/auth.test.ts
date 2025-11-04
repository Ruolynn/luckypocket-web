/**
 * @file Auth Integration Tests
 * @description Integration tests for SIWE authentication endpoints
 */

import { buildApp } from '../../src/app'

describe('Auth SIWE Integration', () => {
  describe('GET /api/v1/auth/nonce', () => {
    it('should return a valid nonce', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })
      const res = await app.inject({ method: 'GET', url: '/api/v1/auth/nonce' })

      expect(res.statusCode).toBe(200)

      const body = res.json()
      expect(body.nonce).toBeDefined()
      expect(typeof body.nonce).toBe('string')
      expect(body.nonce.length).toBeGreaterThan(0)

      // Should be UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(body.nonce).toMatch(uuidRegex)

      await app.close()
    })

    it('should return different nonces on subsequent calls', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res1 = await app.inject({ method: 'GET', url: '/api/v1/auth/nonce' })
      const res2 = await app.inject({ method: 'GET', url: '/api/v1/auth/nonce' })

      expect(res1.statusCode).toBe(200)
      expect(res2.statusCode).toBe(200)

      const nonce1 = res1.json().nonce
      const nonce2 = res2.json().nonce

      expect(nonce1).not.toBe(nonce2)

      await app.close()
    })
  })

  describe('POST /api/v1/auth/verify', () => {
    it('should reject invalid request body', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify',
        payload: {
          message: '', // Invalid: empty message
          signature: '0x123',
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject malformed signature', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify',
        payload: {
          message: 'valid message',
          signature: 'invalid_signature_format', // Not 0x + 130 hex chars
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should reject request without token', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toBe('UNAUTHORIZED')

      await app.close()
    })

    it('should reject request with invalid token', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: 'Bearer invalid_token_123',
        },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toMatch(/INVALID_TOKEN|AUTHENTICATION_FAILED/)

      await app.close()
    })

    it('should reject request with malformed authorization header', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: '', // Empty header
        },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toBe('UNAUTHORIZED')

      await app.close()
    })
  })
})


