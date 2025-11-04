/**
 * @file JWT Service Unit Tests
 * @description Tests for JWT token generation and verification
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { JWTService } from '../../../src/services/jwt.service'
import jwt from 'jsonwebtoken'

describe('JWTService', () => {
  let jwtService: JWTService
  const testSecret = 'test_secret_key_for_testing'
  const testExpiresIn = '1h'

  beforeEach(() => {
    jwtService = new JWTService(testSecret, testExpiresIn)
  })

  describe('constructor', () => {
    it('should use provided secret and expiresIn', () => {
      const service = new JWTService('custom_secret', '2d')
      const token = service.generateToken({ userId: 'u1', address: '0xabc' })
      const decoded = jwt.decode(token) as any
      expect(decoded).toBeDefined()
      expect(decoded.userId).toBe('u1')
    })

    it('should use default values when not provided', () => {
      const service = new JWTService()
      const token = service.generateToken({ userId: 'u1', address: '0xabc' })
      expect(token).toBeDefined()
    })

    it('should throw error in production without proper secret', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      expect(() => {
        new JWTService() // Uses default 'dev_secret_change_me'
      }).toThrow('JWT_SECRET must be set in production environment')

      process.env.NODE_ENV = originalEnv
    })

    it('should not throw error in development with default secret', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      expect(() => {
        new JWTService()
      }).not.toThrow()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        userId: 'user_123',
        address: '0x1234567890abcdef',
      }

      const token = jwtService.generateToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    it('should include userId and address in token payload', () => {
      const payload = {
        userId: 'user_456',
        address: '0xfedcba0987654321',
      }

      const token = jwtService.generateToken(payload)
      const decoded = jwt.decode(token) as any

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.address).toBe(payload.address)
    })

    it('should include iat and exp in token', () => {
      const payload = {
        userId: 'user_789',
        address: '0xabcd',
      }

      const token = jwtService.generateToken(payload)
      const decoded = jwt.decode(token) as any

      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
      expect(decoded.exp).toBeGreaterThan(decoded.iat)
    })

    it('should generate different tokens for different payloads', () => {
      const token1 = jwtService.generateToken({ userId: 'u1', address: '0x1' })
      const token2 = jwtService.generateToken({ userId: 'u2', address: '0x2' })

      expect(token1).not.toBe(token2)
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode valid token', () => {
      const payload = {
        userId: 'user_verify',
        address: '0xverify',
      }

      const token = jwtService.generateToken(payload)
      const decoded = jwtService.verifyToken(token)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.address).toBe(payload.address)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    it('should throw TOKEN_EXPIRED for expired token', () => {
      const expiredService = new JWTService(testSecret, '0s') // Immediate expiration
      const token = expiredService.generateToken({ userId: 'u1', address: '0x1' })

      // Wait a bit to ensure expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(() => {
            jwtService.verifyToken(token)
          }).toThrow('TOKEN_EXPIRED')
          resolve()
        }, 100)
      })
    })

    it('should throw INVALID_TOKEN for malformed token', () => {
      const invalidToken = 'not.a.valid.jwt.token'

      expect(() => {
        jwtService.verifyToken(invalidToken)
      }).toThrow('INVALID_TOKEN')
    })

    it('should throw INVALID_TOKEN for token with wrong secret', () => {
      const otherService = new JWTService('different_secret', testExpiresIn)
      const token = otherService.generateToken({ userId: 'u1', address: '0x1' })

      expect(() => {
        jwtService.verifyToken(token)
      }).toThrow('INVALID_TOKEN')
    })

    it('should throw INVALID_TOKEN for empty token', () => {
      expect(() => {
        jwtService.verifyToken('')
      }).toThrow('INVALID_TOKEN')
    })

    it('should throw INVALID_TOKEN for tampered token', () => {
      const token = jwtService.generateToken({ userId: 'u1', address: '0x1' })
      const tamperedToken = token.slice(0, -5) + 'xxxxx'

      expect(() => {
        jwtService.verifyToken(tamperedToken)
      }).toThrow('INVALID_TOKEN')
    })
  })

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const payload = {
        userId: 'user_decode',
        address: '0xdecode',
      }

      const token = jwtService.generateToken(payload)
      const decoded = jwtService.decodeToken(token)

      expect(decoded).toBeDefined()
      expect(decoded!.userId).toBe(payload.userId)
      expect(decoded!.address).toBe(payload.address)
    })

    it('should decode token even with wrong secret', () => {
      const otherService = new JWTService('different_secret', testExpiresIn)
      const token = otherService.generateToken({ userId: 'u1', address: '0x1' })

      const decoded = jwtService.decodeToken(token)
      expect(decoded).toBeDefined()
      expect(decoded!.userId).toBe('u1')
    })

    it('should return null for invalid token', () => {
      const invalidToken = 'not.a.jwt'
      const decoded = jwtService.decodeToken(invalidToken)
      expect(decoded).toBeNull()
    })

    it('should return null for empty token', () => {
      const decoded = jwtService.decodeToken('')
      expect(decoded).toBeNull()
    })

    it('should decode expired token without throwing', () => {
      const expiredService = new JWTService(testSecret, '0s')
      const token = expiredService.generateToken({ userId: 'u1', address: '0x1' })

      // decodeToken should not throw even for expired tokens
      const decoded = jwtService.decodeToken(token)
      expect(decoded).toBeDefined()
      expect(decoded!.userId).toBe('u1')
    })
  })

  describe('token expiration', () => {
    it('should respect custom expiration time', () => {
      const shortService = new JWTService(testSecret, '1s')
      const token = shortService.generateToken({ userId: 'u1', address: '0x1' })
      const decoded = jwt.decode(token) as any

      const expirationTime = decoded.exp - decoded.iat
      expect(expirationTime).toBe(1) // 1 second
    })

    it('should handle long expiration times', () => {
      const longService = new JWTService(testSecret, '30d')
      const token = longService.generateToken({ userId: 'u1', address: '0x1' })
      const decoded = jwt.decode(token) as any

      const expirationTime = decoded.exp - decoded.iat
      expect(expirationTime).toBe(30 * 24 * 60 * 60) // 30 days in seconds
    })
  })

  describe('payload validation', () => {
    it('should handle addresses with different cases', () => {
      const token1 = jwtService.generateToken({ userId: 'u1', address: '0xABCDEF' })
      const token2 = jwtService.generateToken({ userId: 'u1', address: '0xabcdef' })

      const decoded1 = jwtService.verifyToken(token1)
      const decoded2 = jwtService.verifyToken(token2)

      expect(decoded1.address).toBe('0xABCDEF')
      expect(decoded2.address).toBe('0xabcdef')
    })

    it('should handle long user IDs', () => {
      const longUserId = 'user_' + 'x'.repeat(100)
      const token = jwtService.generateToken({ userId: longUserId, address: '0x1' })
      const decoded = jwtService.verifyToken(token)

      expect(decoded.userId).toBe(longUserId)
    })

    it('should handle special characters in payload', () => {
      const payload = {
        userId: 'user-123_test@example',
        address: '0x1234567890ABCDEFabcdef',
      }

      const token = jwtService.generateToken(payload)
      const decoded = jwtService.verifyToken(token)

      expect(decoded.userId).toBe(payload.userId)
      expect(decoded.address).toBe(payload.address)
    })
  })
})
