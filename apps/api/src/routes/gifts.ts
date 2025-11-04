/**
 * @file Gift Routes
 * @description API endpoints for gift operations
 */

import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { GiftService } from '../services/gift.service'
import { siweAuthMiddleware, optionalAuthMiddleware } from '../middleware/siwe-auth'

// Request schemas
const CreateGiftSchema = z.object({
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  tokenType: z.enum(['ETH', 'ERC20']),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Invalid amount'),
  daysUntilExpiry: z.number().int().min(1).max(365),
  message: z.string().max(500).optional(),
})

const GetGiftsQuerySchema = z.object({
  status: z.enum(['PENDING', 'CLAIMED', 'REFUNDED', 'EXPIRED']).optional(),
  senderId: z.string().optional(),
  recipientId: z.string().optional(),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  orderBy: z.enum(['createdAt', 'expiresAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
})

const plugin: FastifyPluginAsync = async (app) => {
  const giftService = new GiftService(app.prisma)

  /**
   * POST /api/v1/gifts/create
   * Create a new gift
   * Requires authentication
   */
  app.post(
    '/api/v1/gifts/create',
    {
      preHandler: siweAuthMiddleware,
      schema: {
        description: 'Create a new gift',
        tags: ['gifts'],
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['recipientAddress', 'tokenType', 'amount', 'daysUntilExpiry'],
          properties: {
            recipientAddress: { type: 'string' },
            tokenType: { type: 'string', enum: ['ETH', 'ERC20'] },
            tokenAddress: { type: 'string' },
            amount: { type: 'string' },
            daysUntilExpiry: { type: 'number' },
            message: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              txHash: { type: 'string' },
              giftId: { type: 'string' },
              blockNumber: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          })
        }

        // Validate request body
        const body = CreateGiftSchema.parse(request.body)

        // Validate ERC20 requires tokenAddress
        if (body.tokenType === 'ERC20' && !body.tokenAddress) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'tokenAddress is required for ERC20 gifts',
          })
        }

        // Create gift
        const result = await giftService.createGift({
          ...body,
          senderAddress: request.user.address,
        })

        return reply.code(200).send(result)
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: error.errors,
          })
        }

        app.log.error({ error }, 'Failed to create gift')

        // Handle specific errors
        const errorMessage = error.message || 'Unknown error'

        if (errorMessage.includes('Insufficient allowance')) {
          return reply.code(400).send({
            error: 'INSUFFICIENT_ALLOWANCE',
            message: errorMessage,
          })
        }

        if (errorMessage.includes('Missing blockchain configuration')) {
          return reply.code(500).send({
            error: 'SERVER_MISCONFIGURED',
            message: 'Blockchain configuration missing',
          })
        }

        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to create gift',
        })
      }
    }
  )

  /**
   * GET /api/v1/gifts/:giftId
   * Get gift details
   * Optional authentication (shows more details if authenticated)
   */
  app.get(
    '/api/v1/gifts/:giftId',
    {
      preHandler: optionalAuthMiddleware,
      schema: {
        description: 'Get gift details',
        tags: ['gifts'],
        params: {
          type: 'object',
          properties: {
            giftId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              giftId: { type: 'string' },
              chainId: { type: 'number' },
              createTxHash: { type: 'string' },
              sender: { type: 'object' },
              recipient: { type: 'object', nullable: true },
              recipientAddress: { type: 'string' },
              tokenType: { type: 'string' },
              token: { type: 'string' },
              tokenId: { type: 'string' },
              amount: { type: 'string' },
              tokenSymbol: { type: 'string', nullable: true },
              tokenDecimals: { type: 'number', nullable: true },
              tokenName: { type: 'string', nullable: true },
              message: { type: 'string', nullable: true },
              status: { type: 'string' },
              expiresAt: { type: 'string' },
              createdAt: { type: 'string' },
              claimedAt: { type: 'string', nullable: true },
              claims: { type: 'array' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { giftId } = request.params as { giftId: string }

        const gift = await giftService.getGift(giftId)

        return reply.code(200).send(gift)
      } catch (error: any) {
        if (error.message === 'Gift not found') {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: 'Gift not found',
          })
        }

        app.log.error({ error }, 'Failed to get gift')
        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve gift',
        })
      }
    }
  )

  /**
   * GET /api/v1/gifts
   * Get gifts list with filters
   * Optional authentication
   */
  app.get(
    '/api/v1/gifts',
    {
      preHandler: optionalAuthMiddleware,
      schema: {
        description: 'Get gifts list',
        tags: ['gifts'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['PENDING', 'CLAIMED', 'REFUNDED', 'EXPIRED'] },
            senderId: { type: 'string' },
            recipientId: { type: 'string' },
            recipientAddress: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
            orderBy: { type: 'string', enum: ['createdAt', 'expiresAt'] },
            order: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              gifts: { type: 'array' },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
              hasMore: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const query = GetGiftsQuerySchema.parse(request.query)

        const result = await giftService.getGifts(query)

        return reply.code(200).send(result)
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.errors,
          })
        }

        app.log.error({ error }, 'Failed to get gifts')
        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve gifts',
        })
      }
    }
  )

  /**
   * GET /api/v1/gifts/:giftId/claims
   * Get gift claims
   */
  app.get(
    '/api/v1/gifts/:giftId/claims',
    {
      schema: {
        description: 'Get gift claims',
        tags: ['gifts'],
        params: {
          type: 'object',
          properties: {
            giftId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'string' },
                txHash: { type: 'string' },
                chainId: { type: 'number' },
                claimedAt: { type: 'string' },
                claimer: { type: 'object' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { giftId } = request.params as { giftId: string }

        const claims = await giftService.getGiftClaims(giftId)

        return reply.code(200).send(claims)
      } catch (error: any) {
        if (error.message === 'Gift not found') {
          return reply.code(404).send({
            error: 'NOT_FOUND',
            message: 'Gift not found',
          })
        }

        app.log.error({ error }, 'Failed to get gift claims')
        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to retrieve claims',
        })
      }
    }
  )

  /**
   * GET /api/v1/gifts/:giftId/can-claim
   * Check if user can claim a gift
   * Requires authentication
   */
  app.get(
    '/api/v1/gifts/:giftId/can-claim',
    {
      preHandler: siweAuthMiddleware,
      schema: {
        description: 'Check if user can claim gift',
        tags: ['gifts'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            giftId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              canClaim: { type: 'boolean' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          })
        }

        const { giftId } = request.params as { giftId: string }

        const result = await giftService.canClaim(giftId, request.user.address)

        return reply.code(200).send(result)
      } catch (error) {
        app.log.error({ error }, 'Failed to check claim eligibility')
        return reply.code(500).send({
          error: 'INTERNAL_ERROR',
          message: 'Failed to check eligibility',
        })
      }
    }
  )
}

export default plugin
