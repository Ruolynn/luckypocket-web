/**
 * @file Authentication Routes
 * @description SIWE authentication endpoints (EIP-4361)
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service'
import { siweAuthMiddleware } from '../middleware/siwe-auth'
import type { VerifyRequest } from '../types/auth.types'

// Request schemas
const VerifyRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format'),
})

const plugin: FastifyPluginAsync = async (app) => {
  // Initialize auth service
  const authService = new AuthService(app.redis, app.prisma)

  /**
   * GET /api/v1/auth/nonce
   * Generate a new nonce for SIWE authentication
   */
  app.get('/api/v1/auth/nonce', {
    schema: {
      description: 'Generate SIWE nonce',
      tags: ['auth'],
      response: {
        200: {
          type: 'object',
          properties: {
            nonce: { type: 'string' }
          }
        }
      }
    }
  }, async (_request, reply) => {
    try {
      const result = await authService.generateNonce()
      return reply.code(200).send(result)
    } catch (error) {
      app.log.error({ error }, 'Failed to generate nonce')
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to generate nonce'
      })
    }
  })

  /**
   * POST /api/v1/auth/verify
   * Verify SIWE signature and issue JWT token
   */
  app.post('/api/v1/auth/verify', {
    schema: {
      description: 'Verify SIWE signature',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['message', 'signature'],
        properties: {
          message: { type: 'string' },
          signature: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                address: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Validate request body
      const body = VerifyRequestSchema.parse(request.body)

      // Call service to verify signature
      const result = await authService.verifySignature(body as VerifyRequest)

      return reply.code(200).send(result)
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
          details: error.errors
        })
      }

      // Handle auth errors
      const errorMessage = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (errorMessage === 'SIWE_VALIDATION_FAILED') {
        return reply.code(401).send({
          error: 'SIWE_VALIDATION_FAILED',
          message: 'Invalid signature'
        })
      }

      if (errorMessage === 'INVALID_DOMAIN') {
        return reply.code(400).send({
          error: 'INVALID_DOMAIN',
          message: 'Domain mismatch'
        })
      }

      if (errorMessage === 'INVALID_NONCE') {
        return reply.code(400).send({
          error: 'INVALID_NONCE',
          message: 'Nonce is invalid or expired'
        })
      }

      app.log.error({ error }, 'Signature verification failed')
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Signature verification failed'
      })
    }
  })

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user information
   * Requires JWT authentication
   */
  app.get('/api/v1/auth/me', {
    preHandler: siweAuthMiddleware,
    schema: {
      description: 'Get current user info',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            address: { type: 'string' },
            farcasterFid: { type: ['number', 'null'] },
            farcasterName: { type: ['string', 'null'] },
            email: { type: ['string', 'null'] },
            inviteCode: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply) => {
    try {
      if (!request.user?.userId) {
        return reply.code(401).send({
          error: 'UNAUTHORIZED',
          message: 'User not authenticated'
        })
      }

      const user = await authService.getUserById(request.user.userId)

      if (!user) {
        return reply.code(404).send({
          error: 'USER_NOT_FOUND',
          message: 'User not found'
        })
      }

      return reply.code(200).send(user)
    } catch (error) {
      app.log.error({ error, userId: request.user?.userId }, 'Failed to get user info')
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve user information'
      })
    }
  })
}

export default plugin


