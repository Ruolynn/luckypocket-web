/**
 * @file SIWE Auth Middleware Unit Tests
 * @description Tests for JWT authentication middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify'

// Mock JWT service - must be defined before imports
const mockVerifyToken = vi.fn()
vi.mock('../../../src/services/jwt.service', () => ({
  jwtService: {
    verifyToken: (...args: any[]) => mockVerifyToken(...args),
  },
}))

import { siweAuthMiddleware, optionalAuthMiddleware } from '../../../src/middleware/siwe-auth'

describe('SIWE Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>
  let mockDone: HookHandlerDoneFunction

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      headers: {},
      user: undefined,
    }

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }

    mockDone = vi.fn()
  })

  describe('siweAuthMiddleware', () => {
    it('should authenticate valid Bearer token', async () => {
      const mockPayload = {
        userId: 'user_123',
        address: '0xabc',
        iat: 1234567890,
        exp: 1234567899,
      }

      mockRequest.headers = {
        authorization: 'Bearer valid_token_123',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockVerifyToken).toHaveBeenCalledWith('valid_token_123')
      expect(mockRequest.user).toEqual(mockPayload)
      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should authenticate token without Bearer prefix', async () => {
      const mockPayload = {
        userId: 'user_456',
        address: '0xdef',
        iat: 1234567890,
        exp: 1234567899,
      }

      mockRequest.headers = {
        authorization: 'raw_token_456',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockVerifyToken).toHaveBeenCalledWith('raw_token_456')
      expect(mockRequest.user).toEqual(mockPayload)
      expect(mockDone).toHaveBeenCalled()
    })

    it('should reject request with missing Authorization header', async () => {
      mockRequest.headers = {}

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      })
      expect(mockDone).not.toHaveBeenCalled()
      expect(mockRequest.user).toBeUndefined()
    })

    it('should reject request with empty Authorization header', async () => {
      mockRequest.headers = {
        authorization: '',
      }

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      })
    })

    it('should reject expired token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('TOKEN_EXPIRED')
      })

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      })
      expect(mockDone).not.toHaveBeenCalled()
    })

    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('INVALID_TOKEN')
      })

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      })
    })

    it('should handle unknown token verification errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer some_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('SOME_OTHER_ERROR')
      })

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'AUTHENTICATION_FAILED',
        message: 'Token verification failed',
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockRequest.headers = {
        authorization: 'Bearer some_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw 'String error' // Non-Error object
      })

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'AUTHENTICATION_FAILED',
        message: 'Token verification failed',
      })
    })

    it('should handle malformed Authorization header', async () => {
      mockRequest.headers = {
        authorization: 'Bearer  ',
      }

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      })
    })

    it('should handle Authorization header with multiple spaces', async () => {
      const mockPayload = {
        userId: 'user_789',
        address: '0x789',
        iat: 1234567890,
        exp: 1234567899,
      }

      mockRequest.headers = {
        authorization: 'Bearer  token_with_spaces  ',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      // The middleware splits by space, so 'Bearer  token_with_spaces  ' becomes ['Bearer', '', 'token_with_spaces', '', '']
      // It should extract 'token_with_spaces' (parts[1] when parts.length > 2)
      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      // With the current implementation, this should fail as empty string at parts[1]
      expect(mockReply.code).toHaveBeenCalledWith(401)
    })

    it('should handle unexpected middleware errors', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      // Simulate unexpected error in try-catch wrapper
      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockReply.code).toHaveBeenCalled()
    })

    it('should preserve other request properties', async () => {
      const mockPayload = {
        userId: 'user_abc',
        address: '0xabc',
        iat: 1234567890,
        exp: 1234567899,
      }

      mockRequest.headers = {
        authorization: 'Bearer token',
        'content-type': 'application/json',
      }
      mockRequest.body = { some: 'data' }
      mockVerifyToken.mockReturnValue(mockPayload)

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockRequest.body).toEqual({ some: 'data' })
      expect(mockRequest.headers['content-type']).toBe('application/json')
    })
  })

  describe('optionalAuthMiddleware', () => {
    it('should authenticate valid token', async () => {
      const mockPayload = {
        userId: 'user_opt',
        address: '0xopt',
        iat: 1234567890,
        exp: 1234567899,
      }

      mockRequest.headers = {
        authorization: 'Bearer valid_token',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockRequest.user).toEqual(mockPayload)
      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should continue without user when no token provided', async () => {
      mockRequest.headers = {}

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockRequest.user).toBeUndefined()
      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should continue without user when token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('INVALID_TOKEN')
      })

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockRequest.user).toBeUndefined()
      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should continue without user when token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired_token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('TOKEN_EXPIRED')
      })

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockRequest.user).toBeUndefined()
      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should handle unexpected errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer token',
      }
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })

    it('should support both Bearer and raw token formats', async () => {
      const mockPayload = {
        userId: 'user_raw',
        address: '0xraw',
        iat: 1234567890,
        exp: 1234567899,
      }

      // Test with raw token
      mockRequest.headers = {
        authorization: 'raw_token_123',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockVerifyToken).toHaveBeenCalledWith('raw_token_123')
      expect(mockRequest.user).toEqual(mockPayload)
    })

    it('should handle errors during token extraction', async () => {
      // Simulate error by making headers throw
      Object.defineProperty(mockRequest, 'headers', {
        get: () => {
          throw new Error('Header access error')
        },
      })

      await optionalAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockDone).toHaveBeenCalled()
      expect(mockReply.code).not.toHaveBeenCalled()
    })
  })

  describe('token extraction', () => {
    it('should extract token from Bearer format', async () => {
      const mockPayload = {
        userId: 'u1',
        address: '0x1',
        iat: 123,
        exp: 456,
      }

      mockRequest.headers = {
        authorization: 'Bearer my_token',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockVerifyToken).toHaveBeenCalledWith('my_token')
    })

    it('should extract token from raw format', async () => {
      const mockPayload = {
        userId: 'u2',
        address: '0x2',
        iat: 123,
        exp: 456,
      }

      mockRequest.headers = {
        authorization: 'just_token',
      }
      mockVerifyToken.mockReturnValue(mockPayload)

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      expect(mockVerifyToken).toHaveBeenCalledWith('just_token')
    })

    it('should reject lowercase bearer keyword', async () => {
      mockRequest.headers = {
        authorization: 'bearer token', // lowercase 'bearer' - not recognized
      }

      await siweAuthMiddleware(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply,
        mockDone
      )

      // Should reject since 'bearer' is not 'Bearer' and has 2 parts
      expect(mockReply.code).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      })
      expect(mockVerifyToken).not.toHaveBeenCalled()
    })
  })
})
