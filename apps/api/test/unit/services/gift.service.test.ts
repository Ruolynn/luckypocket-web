/**
 * @file Gift Service Unit Tests
 * @description Unit tests for gift service business logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GiftService } from '../../../src/services/gift.service'
import type { PrismaClient } from '@prisma/client'

// Mock Prisma client
const createMockPrisma = () => {
  return {
    gift: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    giftClaim: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(createMockPrisma())),
  } as unknown as PrismaClient
}

describe('GiftService', () => {
  let giftService: GiftService
  let mockPrisma: PrismaClient

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    giftService = new GiftService(mockPrisma)
  })

  describe('getGift', () => {
    it('should retrieve gift by ID with all relations', async () => {
      const mockGift = {
        id: 'gift_1',
        giftId: '0x123',
        chainId: 11155111,
        sender: { id: 'user_1', address: '0xSender' },
        recipient: null,
        recipientAddress: '0xRecipient',
        tokenType: 'ETH',
        token: '0x0000000000000000000000000000000000000000',
        tokenId: '0',
        amount: '100000000000000000',
        tokenSymbol: null,
        tokenDecimals: null,
        tokenName: null,
        message: 'Test gift',
        status: 'PENDING',
        expiresAt: new Date('2024-12-31'),
        createdAt: new Date('2024-01-01'),
        claimedAt: null,
        createTxHash: '0xabc',
        claims: [],
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.getGift('0x123')

      expect(result).toBeDefined()
      expect(result.giftId).toBe('0x123')
      expect(result.status).toBe('PENDING')
      expect(mockPrisma.gift.findUnique).toHaveBeenCalledWith({
        where: { giftId: '0x123' },
        include: {
          sender: true,
          recipient: true,
          claims: {
            include: { claimer: true },
            orderBy: { claimedAt: 'desc' },
          },
        },
      })
    })

    it('should throw error for non-existent gift', async () => {
      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(null)

      await expect(giftService.getGift('nonexistent')).rejects.toThrow('Gift not found')
    })

    it('should handle database errors gracefully', async () => {
      vi.spyOn(mockPrisma.gift, 'findUnique').mockRejectedValue(new Error('Database error'))

      await expect(giftService.getGift('0x123')).rejects.toThrow('Database error')
    })
  })

  describe('getGifts', () => {
    it('should return paginated gifts with default params', async () => {
      const mockGifts = [
        {
          id: 'gift_1',
          giftId: '0x1',
          status: 'PENDING',
          sender: { address: '0xSender1' },
        },
        {
          id: 'gift_2',
          giftId: '0x2',
          status: 'CLAIMED',
          sender: { address: '0xSender2' },
        },
      ]

      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue(mockGifts as any)
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(2)

      const result = await giftService.getGifts({})

      expect(result.gifts).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.hasMore).toBe(false)
    })

    it('should filter gifts by status', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getGifts({ status: 'PENDING' })

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      )
    })

    it('should filter gifts by sender ID', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getGifts({ senderId: 'user_123' })

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            senderId: 'user_123',
          }),
        })
      )
    })

    it('should filter gifts by recipient address', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      const address = '0x1234567890123456789012345678901234567890'
      await giftService.getGifts({ recipientAddress: address })

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientAddress: expect.objectContaining({
              equals: address,
              mode: 'insensitive',
            }),
          }),
        })
      )
    })

    it('should respect limit and offset for pagination', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(100)

      await giftService.getGifts({ limit: 20, offset: 40 })

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 21, // limit + 1 to check hasMore
          skip: 40,
        })
      )
    })

    it('should use default limit of 50', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getGifts({})

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // default limit + 1
        })
      )
    })

    it('should order by createdAt descending by default', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getGifts({})

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should allow custom ordering', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getGifts({ orderBy: 'expiresAt', order: 'asc' })

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { expiresAt: 'asc' },
        })
      )
    })

    it('should calculate hasMore correctly when more items exist', async () => {
      const mockGifts = new Array(51).fill({
        id: 'gift',
        giftId: '0x1',
        sender: { address: '0x1' },
      })

      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue(mockGifts as any)
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(100)

      const result = await giftService.getGifts({ limit: 50 })

      expect(result.hasMore).toBe(true)
      expect(result.gifts).toHaveLength(50) // Should truncate to limit
    })
  })

  describe('getGiftClaims', () => {
    it('should return all claims for a gift', async () => {
      const mockGift = { id: 'gift_1', giftId: '0x123' }
      const mockClaims = [
        {
          id: 'claim_1',
          amount: '100',
          txHash: '0xabc',
          chainId: 11155111,
          claimedAt: new Date(),
          claimer: { address: '0xClaimer1' },
        },
      ]

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.giftClaim, 'findMany').mockResolvedValue(mockClaims as any)

      const result = await giftService.getGiftClaims('0x123')

      expect(result).toHaveLength(1)
      expect(result[0].txHash).toBe('0xabc')
      expect(mockPrisma.giftClaim.findMany).toHaveBeenCalledWith({
        where: { giftId: 'gift_1' },
        include: { claimer: true },
        orderBy: { claimedAt: 'desc' },
      })
    })

    it('should throw error for non-existent gift', async () => {
      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(null)

      await expect(giftService.getGiftClaims('nonexistent')).rejects.toThrow('Gift not found')
    })
  })

  describe('canClaim', () => {
    it('should return false for non-existent gift', async () => {
      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(null)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(false)
      expect(result.reason).toBe('Gift not found')
    })

    it('should return false for already claimed gift', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'CLAIMED',
        recipientAddress: '0xUser',
        expiresAt: new Date('2099-12-31'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(false)
      expect(result.reason).toBe('Gift already claimed')
    })

    it('should return false for refunded gift', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'REFUNDED',
        recipientAddress: '0xUser',
        expiresAt: new Date('2099-12-31'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(false)
      expect(result.reason).toBe('Gift was refunded')
    })

    it('should return false for expired gift', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'EXPIRED',
        recipientAddress: '0xUser',
        expiresAt: new Date('2020-01-01'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(false)
      expect(result.reason).toBe('Gift has expired')
    })

    it('should return false when user is not the recipient', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'PENDING',
        recipientAddress: '0xOtherUser',
        expiresAt: new Date('2099-12-31'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(false)
      expect(result.reason).toBe('You are not the recipient')
    })

    it('should return true when all conditions are met', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'PENDING',
        recipientAddress: '0xUser',
        expiresAt: new Date('2099-12-31'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xUser')

      expect(result.canClaim).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should handle case-insensitive address comparison', async () => {
      const mockGift = {
        id: 'gift_1',
        status: 'PENDING',
        recipientAddress: '0xABCDEF',
        expiresAt: new Date('2099-12-31'),
      }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)

      const result = await giftService.canClaim('0x123', '0xabcdef')

      expect(result.canClaim).toBe(true)
    })
  })

  describe('recordClaim', () => {
    it('should throw error for non-existent gift', async () => {
      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(null)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('Gift not found')
    })

    it('should throw error for non-existent user', async () => {
      const mockGift = { id: 'gift_1', recipientAddress: '0xUser' }
      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.user, 'findUnique').mockResolvedValue(null)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('User not found')
    })

    it('should throw error when user is not the recipient', async () => {
      const mockGift = { id: 'gift_1', recipientAddress: '0xOtherUser', status: 'PENDING' }
      const mockUser = { id: 'user_1', address: '0xUser' }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('User is not the recipient of this gift')
    })

    it('should throw error for already claimed gift', async () => {
      const mockGift = { id: 'gift_1', recipientAddress: '0xUser', status: 'CLAIMED' }
      const mockUser = { id: 'user_1', address: '0xUser' }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('Gift already claimed')
    })

    it('should throw error for refunded gift', async () => {
      const mockGift = { id: 'gift_1', recipientAddress: '0xUser', status: 'REFUNDED' }
      const mockUser = { id: 'user_1', address: '0xUser' }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('Gift was refunded')
    })

    it('should throw error for expired gift', async () => {
      const mockGift = {
        id: 'gift_1',
        recipientAddress: '0xUser',
        status: 'EXPIRED',
        expiresAt: new Date('2020-01-01'),
      }
      const mockUser = { id: 'user_1', address: '0xUser' }

      vi.spyOn(mockPrisma.gift, 'findUnique').mockResolvedValue(mockGift as any)
      vi.spyOn(mockPrisma.user, 'findUnique').mockResolvedValue(mockUser as any)

      await expect(
        giftService.recordClaim('0x123', 'user_1', { txHash: '0x' + '1'.repeat(64) })
      ).rejects.toThrow('Gift has expired')
    })
  })

  describe('markExpiredGifts', () => {
    it('should update expired pending gifts to EXPIRED status', async () => {
      const mockResult = { count: 5 }

      vi.spyOn(mockPrisma.gift, 'updateMany').mockResolvedValue(mockResult as any)

      const result = await giftService.markExpiredGifts()

      expect(result.markedExpired).toBe(5)
      expect(mockPrisma.gift.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expiresAt: { lt: expect.any(Date) },
        },
        data: { status: 'EXPIRED' },
      })
    })

    it('should return 0 when no gifts expired', async () => {
      vi.spyOn(mockPrisma.gift, 'updateMany').mockResolvedValue({ count: 0 } as any)

      const result = await giftService.markExpiredGifts()

      expect(result.markedExpired).toBe(0)
    })
  })

  describe('getUserSentGifts', () => {
    it('should throw error for non-existent user', async () => {
      vi.spyOn(mockPrisma.user, 'findFirst').mockResolvedValue(null)

      await expect(giftService.getUserSentGifts('0xUser')).rejects.toThrow(
        'User not found with address'
      )
    })

    it('should return gifts sent by user', async () => {
      const mockUser = { id: 'user_1', address: '0xUser' }
      const mockGifts = [{ id: 'gift_1', senderId: 'user_1' }]

      vi.spyOn(mockPrisma.user, 'findFirst').mockResolvedValue(mockUser as any)
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue(mockGifts as any)
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(1)

      const result = await giftService.getUserSentGifts('0xUser')

      expect(result.gifts).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe('getUserReceivedGifts', () => {
    it('should return gifts received by user address', async () => {
      const mockGifts = [{ id: 'gift_1', recipientAddress: '0xUser' }]

      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue(mockGifts as any)
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(1)

      const result = await giftService.getUserReceivedGifts('0xUser')

      expect(result.gifts).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientAddress: expect.objectContaining({
              equals: '0xUser',
              mode: 'insensitive',
            }),
          }),
        })
      )
    })

    it('should handle case-insensitive address lookup', async () => {
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(0)

      await giftService.getUserReceivedGifts('0xABCDEF')

      expect(mockPrisma.gift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientAddress: expect.objectContaining({
              equals: '0xABCDEF',
              mode: 'insensitive',
            }),
          }),
        })
      )
    })
  })

  describe('getGlobalStats', () => {
    it('should return aggregated statistics', async () => {
      vi.spyOn(mockPrisma.gift, 'count').mockResolvedValue(100)
      vi.spyOn(mockPrisma.giftClaim, 'findMany').mockResolvedValue([])
      vi.spyOn(mockPrisma.gift, 'groupBy').mockResolvedValue([
        { status: 'PENDING', _count: { status: 50 } },
        { status: 'CLAIMED', _count: { status: 30 } },
        { status: 'EXPIRED', _count: { status: 20 } },
      ] as any)
      vi.spyOn(mockPrisma.gift, 'findMany').mockResolvedValue([])

      const result = await giftService.getGlobalStats()

      expect(result.totalGifts).toBe(100)
      expect(result.totalByStatus).toHaveProperty('PENDING', 50)
      expect(result.totalByStatus).toHaveProperty('CLAIMED', 30)
      expect(result.totalByStatus).toHaveProperty('EXPIRED', 20)
    })
  })
})
