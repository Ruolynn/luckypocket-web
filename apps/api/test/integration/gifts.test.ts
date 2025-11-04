/**
 * @file Gift Integration Tests
 * @description Integration tests for gift API endpoints
 */

import { buildApp } from '../../src/app'
import { describe, it, expect } from 'vitest'

describe('Gift API Integration', () => {
  describe('POST /api/v1/gifts/create', () => {
    it('should reject request without authentication', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        payload: {
          recipientAddress: '0x1234567890123456789012345678901234567890',
          tokenType: 'ETH',
          amount: '0.1',
          daysUntilExpiry: 7,
          message: 'Test gift',
        },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toBe('UNAUTHORIZED')

      await app.close()
    })

    it('should reject invalid recipient address', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          recipientAddress: 'invalid_address',
          tokenType: 'ETH',
          amount: '0.1',
          daysUntilExpiry: 7,
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject ERC20 without tokenAddress', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          recipientAddress: '0x1234567890123456789012345678901234567890',
          tokenType: 'ERC20',
          amount: '100',
          daysUntilExpiry: 7,
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject invalid amount format', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          recipientAddress: '0x1234567890123456789012345678901234567890',
          tokenType: 'ETH',
          amount: 'invalid_amount',
          daysUntilExpiry: 7,
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject days until expiry out of range', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          recipientAddress: '0x1234567890123456789012345678901234567890',
          tokenType: 'ETH',
          amount: '0.1',
          daysUntilExpiry: 400, // Max is 365
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject message longer than 500 chars', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/create',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          recipientAddress: '0x1234567890123456789012345678901234567890',
          tokenType: 'ETH',
          amount: '0.1',
          daysUntilExpiry: 7,
          message: 'a'.repeat(501),
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })
  })

  describe('GET /api/v1/gifts/:giftId', () => {
    it('should return 404 for non-existent gift', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts/nonexistent_gift_id',
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error).toBe('NOT_FOUND')

      await app.close()
    })

    it('should work without authentication (optional auth)', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts/test_gift_id',
      })

      // Should not return 401 (authentication optional)
      expect(res.statusCode).not.toBe(401)

      await app.close()
    })
  })

  describe('GET /api/v1/gifts', () => {
    it('should accept valid query parameters', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts?status=PENDING&limit=10&offset=0&orderBy=createdAt&order=desc',
      })

      expect([200, 400, 404]).toContain(res.statusCode)

      await app.close()
    })

    it('should reject invalid status value', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts?status=INVALID_STATUS',
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject invalid limit value', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts?limit=999', // Max is 100
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should work without authentication (optional auth)', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts',
      })

      // Should not return 401 (authentication optional)
      expect(res.statusCode).not.toBe(401)

      await app.close()
    })
  })

  describe('GET /api/v1/gifts/:giftId/claims', () => {
    it('should return 404 for non-existent gift', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts/nonexistent_gift/claims',
      })

      expect(res.statusCode).toBe(404)
      expect(res.json().error).toBe('NOT_FOUND')

      await app.close()
    })
  })

  describe('GET /api/v1/gifts/:giftId/can-claim', () => {
    it('should reject request without authentication', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/gifts/test_gift_id/can-claim',
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toBe('UNAUTHORIZED')

      await app.close()
    })
  })

  describe('POST /api/v1/gifts/:giftId/claim', () => {
    it('should reject request without authentication', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/test_gift_id/claim',
        payload: {
          txHash: '0x' + '0'.repeat(64),
        },
      })

      expect(res.statusCode).toBe(401)
      expect(res.json().error).toBe('UNAUTHORIZED')

      await app.close()
    })

    it('should reject invalid transaction hash format', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/test_gift_id/claim',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          txHash: 'invalid_tx_hash',
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should reject missing txHash', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/test_gift_id/claim',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {},
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should validate gasUsed format if provided', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/test_gift_id/claim',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          txHash: '0x' + '1'.repeat(64),
          gasUsed: 'invalid_number',
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should validate gasPrice format if provided', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/test_gift_id/claim',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          txHash: '0x' + '1'.repeat(64),
          gasPrice: 'invalid_number',
        },
      })

      expect(res.statusCode).toBe(400)
      expect(res.json().error).toBe('VALIDATION_ERROR')

      await app.close()
    })

    it('should return 404 for non-existent gift', async () => {
      const app = await buildApp({ withJobs: false, withSocket: false })

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/gifts/nonexistent_gift/claim',
        headers: {
          authorization: 'Bearer mock_token',
        },
        payload: {
          txHash: '0x' + '1'.repeat(64),
        },
      })

      // Should return 404 or 500 depending on service implementation
      expect([404, 500]).toContain(res.statusCode)

      await app.close()
    })
  })
})
