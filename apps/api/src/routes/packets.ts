/**
 * @file Packet Routes
 * @description API routes for red packet operations and details
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

// Request validation schemas
const getPacketDetailsSchema = z.object({
  packetId: z.string().min(1, 'Packet ID is required'),
})

const getPacketClaimsSchema = z.object({
  packetId: z.string().min(1, 'Packet ID is required'),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
  sortBy: z.enum(['claimedAt', 'amount']).optional().default('claimedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

const getPacketStatsSchema = z.object({
  packetId: z.string().min(1, 'Packet ID is required'),
})

export default async function packetRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/packets/:packetId
   * Get detailed information about a specific packet
   */
  fastify.get('/:packetId', async (request, reply) => {
    try {
      const { packetId } = getPacketDetailsSchema.parse(request.params)

      // Find packet with creator and claims
      const packet = await fastify.prisma.packet.findUnique({
        where: { packetId },
        include: {
          creator: {
            select: {
              id: true,
              address: true,
              farcasterFid: true,
              farcasterName: true,
            },
          },
          claims: {
            include: {
              claimer: {
                select: {
                  id: true,
                  address: true,
                  farcasterFid: true,
                  farcasterName: true,
                },
              },
            },
            orderBy: { claimedAt: 'desc' },
          },
        },
      })

      if (!packet) {
        return reply.code(404).send({
          error: 'Packet not found',
          message: `No packet found with ID: ${packetId}`,
        })
      }

      // Calculate statistics
      const totalClaimed = packet.claims.length
      const percentClaimed = packet.count > 0 ? Math.round((totalClaimed / packet.count) * 100) : 0
      const isFullyClaimed = totalClaimed >= packet.count
      const isExpired = new Date() > packet.expireTime
      const isActive = !isFullyClaimed && !isExpired && !packet.refunded

      // Find best claim (手气最佳)
      const bestClaim = packet.claims.length > 0
        ? packet.claims.reduce((best: typeof packet.claims[0], claim: typeof packet.claims[0]) => {
            return BigInt(claim.amount) > BigInt(best.amount) ? claim : best
          })
        : null

      return reply.send({
        packet: {
          id: packet.id,
          packetId: packet.packetId,
          txHash: packet.txHash,
          chainId: packet.chainId,
          creator: packet.creator,
          token: packet.token,
          tokenSymbol: packet.tokenSymbol,
          tokenDecimals: packet.tokenDecimals,
          tokenName: packet.tokenName,
          totalAmount: packet.totalAmount,
          count: packet.count,
          isRandom: packet.isRandom,
          message: packet.message,
          remainingAmount: packet.remainingAmount,
          remainingCount: packet.remainingCount,
          vrfRequestId: packet.vrfRequestId,
          randomReady: packet.randomReady,
          expireTime: packet.expireTime,
          refunded: packet.refunded,
          createdAt: packet.createdAt,
          updatedAt: packet.updatedAt,
        },
        statistics: {
          totalClaimed,
          remainingCount: packet.remainingCount,
          percentClaimed,
          isFullyClaimed,
          isExpired,
          isActive,
        },
        bestClaim: bestClaim
          ? {
              id: bestClaim.id,
              claimer: bestClaim.claimer,
              amount: bestClaim.amount,
              claimedAt: bestClaim.claimedAt,
            }
          : null,
        claimsPreview: packet.claims.slice(0, 5).map((claim: typeof packet.claims[0]) => ({
          id: claim.id,
          claimer: claim.claimer,
          amount: claim.amount,
          isBest: claim.isBest,
          claimedAt: claim.claimedAt,
        })),
      })
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to get packet details')

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        })
      }

      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch packet details',
      })
    }
  })

  /**
   * GET /api/packets/:packetId/claims
   * Get paginated list of claims for a packet
   */
  fastify.get('/:packetId/claims', async (request, reply) => {
    try {
      const params = getPacketClaimsSchema.parse({
        packetId: (request.params as any).packetId,
        ...request.query,
      })

      // Verify packet exists
      const packet = await fastify.prisma.packet.findUnique({
        where: { packetId: params.packetId },
        select: { id: true, packetId: true, count: true },
      })

      if (!packet) {
        return reply.code(404).send({
          error: 'Packet not found',
          message: `No packet found with ID: ${params.packetId}`,
        })
      }

      // Get paginated claims
      const [claims, total] = await Promise.all([
        fastify.prisma.packetClaim.findMany({
          where: { packetId: packet.id },
          include: {
            claimer: {
              select: {
                id: true,
                address: true,
                farcasterFid: true,
                farcasterName: true,
              },
            },
          },
          orderBy: {
            [params.sortBy]: params.sortOrder,
          },
          skip: params.offset,
          take: params.limit,
        }),
        fastify.prisma.packetClaim.count({
          where: { packetId: packet.id },
        }),
      ])

      return reply.send({
        claims: claims.map((claim) => ({
          id: claim.id,
          claimer: claim.claimer,
          amount: claim.amount,
          txHash: claim.txHash,
          isBest: claim.isBest,
          claimedAt: claim.claimedAt,
        })),
        pagination: {
          total,
          limit: params.limit,
          offset: params.offset,
          hasMore: params.offset + params.limit < total,
        },
      })
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to get packet claims')

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        })
      }

      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch packet claims',
      })
    }
  })

  /**
   * GET /api/packets/:packetId/stats
   * Get real-time statistics for a packet
   */
  fastify.get('/:packetId/stats', async (request, reply) => {
    try {
      const { packetId } = getPacketStatsSchema.parse(request.params)

      const packet = await fastify.prisma.packet.findUnique({
        where: { packetId },
        include: {
          claims: {
            select: {
              amount: true,
              isBest: true,
            },
          },
        },
      })

      if (!packet) {
        return reply.code(404).send({
          error: 'Packet not found',
          message: `No packet found with ID: ${packetId}`,
        })
      }

      // Calculate statistics
      const totalClaimed = packet.claims.length
      const remainingCount = packet.remainingCount
      const percentClaimed = packet.count > 0 ? Math.round((totalClaimed / packet.count) * 100) : 0
      const isFullyClaimed = totalClaimed >= packet.count
      const isExpired = new Date() > packet.expireTime
      const isActive = !isFullyClaimed && !isExpired && !packet.refunded

      // Calculate average claim amount
      const totalClaimedAmount = packet.claims.reduce((sum, claim) => {
        return sum + BigInt(claim.amount)
      }, BigInt(0))

      const averageClaimAmount =
        totalClaimed > 0 ? (totalClaimedAmount / BigInt(totalClaimed)).toString() : '0'

      // Find best claim
      const bestClaim = packet.claims.find((claim) => claim.isBest)

      return reply.send({
        statistics: {
          totalCount: packet.count,
          totalClaimed,
          remainingCount,
          percentClaimed,
          totalAmount: packet.totalAmount,
          remainingAmount: packet.remainingAmount,
          averageClaimAmount,
          isFullyClaimed,
          isExpired,
          isActive,
          isRandom: packet.isRandom,
          randomReady: packet.randomReady,
          bestClaimAmount: bestClaim?.amount || null,
        },
        timestamps: {
          createdAt: packet.createdAt,
          expireTime: packet.expireTime,
          updatedAt: packet.updatedAt,
        },
      })
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to get packet stats')

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        })
      }

      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch packet statistics',
      })
    }
  })

  /**
   * GET /api/packets/:packetId/can-claim
   * Check if current user can claim this packet
   */
  fastify.get('/:packetId/can-claim', {
    onRequest: [fastify.authenticate], // Require authentication
  }, async (request, reply) => {
    try {
      const { packetId } = getPacketDetailsSchema.parse(request.params)
      const userId = request.user.userId

      const packet = await fastify.prisma.packet.findUnique({
        where: { packetId },
        include: {
          claims: {
            where: { claimerId: userId },
            select: { id: true },
          },
        },
      })

      if (!packet) {
        return reply.code(404).send({
          error: 'Packet not found',
          message: `No packet found with ID: ${packetId}`,
        })
      }

      const isExpired = new Date() > packet.expireTime
      const isFullyClaimed = packet.remainingCount <= 0
      const hasAlreadyClaimed = packet.claims.length > 0
      const isCreator = packet.creatorId === userId
      const isRefunded = packet.refunded

      const canClaim = !isExpired && !isFullyClaimed && !hasAlreadyClaimed && !isCreator && !isRefunded

      return reply.send({
        canClaim,
        reasons: {
          isExpired,
          isFullyClaimed,
          hasAlreadyClaimed,
          isCreator,
          isRefunded,
        },
        packet: {
          packetId: packet.packetId,
          remainingCount: packet.remainingCount,
          expireTime: packet.expireTime,
          isRandom: packet.isRandom,
          randomReady: packet.randomReady,
        },
      })
    } catch (error: any) {
      fastify.log.error({ error }, 'Failed to check claim eligibility')

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        })
      }

      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to check claim eligibility',
      })
    }
  })
}
