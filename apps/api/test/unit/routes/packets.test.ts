/**
 * @file Packet Routes Unit Tests
 * @description Tests for packet detail API endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildApp } from '../../../src/app'
import type { FastifyInstance } from 'fastify'

describe('Packet Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await buildApp({ withJobs: false, withSocket: false })

    // Clean up test data
    await app.prisma.packetClaim.deleteMany({})
    await app.prisma.packet.deleteMany({})
    await app.prisma.user.deleteMany({})
  })

  afterEach(async () => {
    await app.close()
  })

  describe('GET /api/v1/packets/:packetId', () => {
    it('should return 404 for non-existent packet', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/packets/non-existent-packet-id',
      })

      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Packet not found')
    })

    it('should return packet details when packet exists', async () => {
      // Create test user
      const user = await app.prisma.user.create({
        data: {
          address: '0x1234567890123456789012345678901234567890',
          inviteCode: 'TEST001',
        },
      })

      // Create test packet
      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-001',
          txHash: '0xabcd1234',
          chainId: 11155111,
          creatorId: user.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          tokenName: 'Ethereum',
          totalAmount: '1000000000000000000', // 1 ETH
          count: 10,
          isRandom: false,
          message: 'Test packet',
          remainingAmount: '1000000000000000000',
          remainingCount: 10,
          expireTime: new Date(Date.now() + 86400000), // 1 day from now
          randomReady: false,
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.packet).toBeDefined()
      expect(body.packet.packetId).toBe('test-packet-001')
      expect(body.packet.totalAmount).toBe('1000000000000000000')
      expect(body.packet.count).toBe(10)
      expect(body.packet.creator).toBeDefined()
      expect(body.packet.creator.address).toBe(user.address)

      expect(body.statistics).toBeDefined()
      expect(body.statistics.totalClaimed).toBe(0)
      expect(body.statistics.remainingCount).toBe(10)
      expect(body.statistics.isActive).toBe(true)
      expect(body.statistics.isExpired).toBe(false)

      expect(body.bestClaim).toBeNull()
      expect(body.claimsPreview).toEqual([])
    })

    it('should return packet with claims and best claim', async () => {
      // Create test users
      const creator = await app.prisma.user.create({
        data: {
          address: '0x1111111111111111111111111111111111111111',
          inviteCode: 'CREATOR01',
        },
      })

      const claimer1 = await app.prisma.user.create({
        data: {
          address: '0x2222222222222222222222222222222222222222',
          inviteCode: 'CLAIMER01',
        },
      })

      const claimer2 = await app.prisma.user.create({
        data: {
          address: '0x3333333333333333333333333333333333333333',
          inviteCode: 'CLAIMER02',
        },
      })

      // Create test packet
      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-002',
          txHash: '0xabcd5678',
          chainId: 11155111,
          creatorId: creator.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          tokenName: 'Ethereum',
          totalAmount: '3000000000000000000', // 3 ETH
          count: 3,
          isRandom: true,
          message: 'Random packet',
          remainingAmount: '500000000000000000', // 0.5 ETH remaining
          remainingCount: 1,
          expireTime: new Date(Date.now() + 86400000),
          randomReady: true,
        },
      })

      // Create claims
      await app.prisma.packetClaim.create({
        data: {
          packetId: packet.id,
          claimerId: claimer1.id,
          amount: '1500000000000000000', // 1.5 ETH (best)
          txHash: '0xtx001',
          isBest: true,
        },
      })

      await app.prisma.packetClaim.create({
        data: {
          packetId: packet.id,
          claimerId: claimer2.id,
          amount: '1000000000000000000', // 1 ETH
          txHash: '0xtx002',
          isBest: false,
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.packet.isRandom).toBe(true)
      expect(body.packet.randomReady).toBe(true)

      expect(body.statistics.totalClaimed).toBe(2)
      expect(body.statistics.remainingCount).toBe(1)
      expect(body.statistics.percentClaimed).toBe(67) // 2/3 = 66.67%

      expect(body.bestClaim).toBeDefined()
      expect(body.bestClaim.amount).toBe('1500000000000000000')
      expect(body.bestClaim.claimer.address).toBe(claimer1.address)

      expect(body.claimsPreview).toHaveLength(2)
    })
  })

  describe('GET /api/v1/packets/:packetId/claims', () => {
    it('should return 404 for non-existent packet', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/packets/non-existent/claims',
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return empty claims list for packet with no claims', async () => {
      const user = await app.prisma.user.create({
        data: {
          address: '0x4444444444444444444444444444444444444444',
          inviteCode: 'USER001',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-003',
          txHash: '0xtest003',
          chainId: 11155111,
          creatorId: user.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '1000000000000000000',
          count: 5,
          isRandom: false,
          remainingAmount: '1000000000000000000',
          remainingCount: 5,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.claims).toEqual([])
      expect(body.pagination.total).toBe(0)
      expect(body.pagination.hasMore).toBe(false)
    })

    it('should return paginated claims with default sorting', async () => {
      const creator = await app.prisma.user.create({
        data: {
          address: '0x5555555555555555555555555555555555555555',
          inviteCode: 'CREATOR02',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-004',
          txHash: '0xtest004',
          chainId: 11155111,
          creatorId: creator.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '5000000000000000000',
          count: 5,
          isRandom: false,
          remainingAmount: '0',
          remainingCount: 0,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      // Create 5 claimers and claims
      for (let i = 1; i <= 5; i++) {
        const claimer = await app.prisma.user.create({
          data: {
            address: `0x${i.toString().padStart(40, '6')}`,
            inviteCode: `CLAIM${i.toString().padStart(3, '0')}`,
          },
        })

        await app.prisma.packetClaim.create({
          data: {
            packetId: packet.id,
            claimerId: claimer.id,
            amount: `${i * 100000000000000000}`, // 0.1, 0.2, 0.3, 0.4, 0.5 ETH
            txHash: `0xtxclaim${Date.now()}${i.toString().padStart(3, '0')}`,
            isBest: i === 5, // Last one is best
          },
        })

        // Small delay to ensure different timestamps
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      // Test default pagination (limit=50, offset=0, sortBy=claimedAt, sortOrder=desc)
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.claims).toHaveLength(5)
      expect(body.pagination.total).toBe(5)
      expect(body.pagination.limit).toBe(50)
      expect(body.pagination.offset).toBe(0)
      expect(body.pagination.hasMore).toBe(false)

      // Check that claims are sorted by claimedAt desc (most recent first)
      const timestamps = body.claims.map((c: any) => new Date(c.claimedAt).getTime())
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1])
      }
    })

    it('should support pagination with limit and offset', async () => {
      const creator = await app.prisma.user.create({
        data: {
          address: '0x7777777777777777777777777777777777777777',
          inviteCode: 'CREATOR03',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-005',
          txHash: '0xtest005',
          chainId: 11155111,
          creatorId: creator.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '10000000000000000000',
          count: 10,
          isRandom: false,
          remainingAmount: '0',
          remainingCount: 0,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      // Create 10 claims
      for (let i = 1; i <= 10; i++) {
        const claimer = await app.prisma.user.create({
          data: {
            address: `0x${i.toString().padStart(40, '8')}`,
            inviteCode: `PAGE${i.toString().padStart(3, '0')}`,
          },
        })

        await app.prisma.packetClaim.create({
          data: {
            packetId: packet.id,
            claimerId: claimer.id,
            amount: '1000000000000000000',
            txHash: `0xpage${Date.now()}${i.toString().padStart(3, '0')}`,
          },
        })
        await new Promise((resolve) => setTimeout(resolve, 5))
      }

      // Get first page (3 items)
      const page1 = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims?limit=3&offset=0`,
      })

      expect(page1.statusCode).toBe(200)
      const body1 = JSON.parse(page1.body)
      expect(body1.claims).toHaveLength(3)
      expect(body1.pagination.total).toBe(10)
      expect(body1.pagination.hasMore).toBe(true)

      // Get second page
      const page2 = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims?limit=3&offset=3`,
      })

      const body2 = JSON.parse(page2.body)
      expect(body2.claims).toHaveLength(3)
      expect(body2.pagination.hasMore).toBe(true)

      // Get last page
      const page4 = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims?limit=3&offset=9`,
      })

      const body4 = JSON.parse(page4.body)
      expect(body4.claims).toHaveLength(1)
      expect(body4.pagination.hasMore).toBe(false)
    })

    it('should support sorting by amount', async () => {
      const creator = await app.prisma.user.create({
        data: {
          address: '0x9999999999999999999999999999999999999999',
          inviteCode: 'CREATOR04',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-006',
          txHash: '0xtest006',
          chainId: 11155111,
          creatorId: creator.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '6000000000000000000',
          count: 3,
          isRandom: true,
          remainingAmount: '0',
          remainingCount: 0,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      const amounts = ['1000000000000000000', '3000000000000000000', '2000000000000000000']

      for (let i = 0; i < 3; i++) {
        const claimer = await app.prisma.user.create({
          data: {
            address: `0xa${i.toString().padStart(39, '0')}`,
            inviteCode: `SORT${i.toString().padStart(3, '0')}`,
          },
        })

        await app.prisma.packetClaim.create({
          data: {
            packetId: packet.id,
            claimerId: claimer.id,
            amount: amounts[i],
            txHash: `0xsort${Date.now()}${i.toString().padStart(3, '0')}`,
          },
        })
        await new Promise((resolve) => setTimeout(resolve, 5))
      }

      // Sort by amount descending
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/claims?sortBy=amount&sortOrder=desc`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.claims[0].amount).toBe('3000000000000000000')
      expect(body.claims[1].amount).toBe('2000000000000000000')
      expect(body.claims[2].amount).toBe('1000000000000000000')
    })
  })

  describe('GET /api/v1/packets/:packetId/stats', () => {
    it('should return 404 for non-existent packet', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/packets/non-existent/stats',
      })

      expect(response.statusCode).toBe(404)
    })

    it('should return correct statistics for packet with no claims', async () => {
      const user = await app.prisma.user.create({
        data: {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          inviteCode: 'STATS001',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-stats-001',
          txHash: '0xstats001',
          chainId: 11155111,
          creatorId: user.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '5000000000000000000',
          count: 5,
          isRandom: false,
          remainingAmount: '5000000000000000000',
          remainingCount: 5,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/stats`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.statistics.totalCount).toBe(5)
      expect(body.statistics.totalClaimed).toBe(0)
      expect(body.statistics.remainingCount).toBe(5)
      expect(body.statistics.percentClaimed).toBe(0)
      expect(body.statistics.totalAmount).toBe('5000000000000000000')
      expect(body.statistics.remainingAmount).toBe('5000000000000000000')
      expect(body.statistics.averageClaimAmount).toBe('0')
      expect(body.statistics.isActive).toBe(true)
      expect(body.statistics.isExpired).toBe(false)
      expect(body.statistics.isFullyClaimed).toBe(false)
      expect(body.statistics.bestClaimAmount).toBeNull()
    })

    it('should calculate correct average and best claim', async () => {
      const creator = await app.prisma.user.create({
        data: {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          inviteCode: 'STATS002',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-stats-002',
          txHash: '0xstats002',
          chainId: 11155111,
          creatorId: creator.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '6000000000000000000',
          count: 3,
          isRandom: true,
          remainingAmount: '0',
          remainingCount: 0,
          expireTime: new Date(Date.now() + 86400000),
        },
      })

      // Create claims: 1 ETH, 2 ETH, 3 ETH (average = 2 ETH, best = 3 ETH)
      const amounts = ['1000000000000000000', '2000000000000000000', '3000000000000000000']

      for (let i = 0; i < 3; i++) {
        const claimer = await app.prisma.user.create({
          data: {
            address: `0xc${i.toString().padStart(39, '0')}`,
            inviteCode: `AVG${i.toString().padStart(3, '0')}`,
          },
        })

        await app.prisma.packetClaim.create({
          data: {
            packetId: packet.id,
            claimerId: claimer.id,
            amount: amounts[i],
            txHash: `0xavg${Date.now()}${i}`,
            isBest: i === 2, // Last one is best
          },
        })
        await new Promise((resolve) => setTimeout(resolve, 5))
      }

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/stats`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.statistics.totalClaimed).toBe(3)
      expect(body.statistics.percentClaimed).toBe(100)
      expect(body.statistics.averageClaimAmount).toBe('2000000000000000000') // 2 ETH
      expect(body.statistics.bestClaimAmount).toBe('3000000000000000000') // 3 ETH
      expect(body.statistics.isFullyClaimed).toBe(true)
      expect(body.statistics.isActive).toBe(false)
    })

    it('should correctly identify expired packets', async () => {
      const user = await app.prisma.user.create({
        data: {
          address: '0xdddddddddddddddddddddddddddddddddddddddd',
          inviteCode: 'EXPIRED01',
        },
      })

      const packet = await app.prisma.packet.create({
        data: {
          packetId: 'test-packet-expired',
          txHash: '0xexpired',
          chainId: 11155111,
          creatorId: user.id,
          token: '0x0000000000000000000000000000000000000000',
          tokenSymbol: 'ETH',
          tokenDecimals: 18,
          totalAmount: '1000000000000000000',
          count: 5,
          isRandom: false,
          remainingAmount: '1000000000000000000',
          remainingCount: 5,
          expireTime: new Date(Date.now() - 86400000), // Expired 1 day ago
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/packets/${packet.packetId}/stats`,
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.statistics.isExpired).toBe(true)
      expect(body.statistics.isActive).toBe(false)
    })
  })

  describe('GET /api/v1/packets/:packetId/can-claim (authenticated)', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/packets/test-packet/can-claim',
      })

      expect(response.statusCode).toBe(401)
    })

    // Note: Full authentication tests would require JWT token generation
    // which is beyond the scope of this unit test
  })
})
