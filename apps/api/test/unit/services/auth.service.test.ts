/**
 * @file Auth Service Unit Tests
 * @description Tests for SIWE authentication service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AuthService } from '../../../src/services/auth.service'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'

// Mock the siwe library
vi.mock('siwe', () => ({
  SiweMessage: vi.fn().mockImplementation((message: string) => ({
    validate: vi.fn().mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      nonce: 'test-nonce-123',
      domain: 'zesty.studio',
      chainId: 11155111,
    }),
  })),
}))

// Mock JWT service
vi.mock('../../../src/services/jwt.service', () => ({
  jwtService: {
    generateToken: vi.fn().mockReturnValue('mock_jwt_token'),
  },
}))

describe('AuthService', () => {
  let authService: AuthService
  let mockRedis: Partial<Redis>
  let mockPrisma: any
  let originalSiweDomain: string | undefined

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Save and clear SIWE_DOMAIN environment variable to prevent test interference
    originalSiweDomain = process.env.SIWE_DOMAIN
    delete process.env.SIWE_DOMAIN

    // Mock Redis
    mockRedis = {
      setex: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue('1'),
    }

    // Mock Prisma
    mockPrisma = {
      user: {
        upsert: vi.fn().mockResolvedValue({
          id: 'user_123',
          address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
        findUnique: vi.fn().mockResolvedValue({
          id: 'user_123',
          address: '0x1234567890abcdef1234567890abcdef12345678',
          farcasterFid: null,
          farcasterName: null,
          email: null,
          inviteCode: 'ABC123',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-01'),
        }),
      },
    }

    authService = new AuthService(mockRedis as Redis, mockPrisma as PrismaClient)
  })

  afterEach(() => {
    // Restore original SIWE_DOMAIN
    if (originalSiweDomain !== undefined) {
      process.env.SIWE_DOMAIN = originalSiweDomain
    } else {
      delete process.env.SIWE_DOMAIN
    }
  })

  describe('generateNonce', () => {
    it('should generate a valid nonce', async () => {
      const result = await authService.generateNonce()

      expect(result.nonce).toBeDefined()
      expect(typeof result.nonce).toBe('string')
      expect(result.nonce.length).toBeGreaterThan(0)
    })

    it('should store nonce in Redis with correct TTL', async () => {
      const result = await authService.generateNonce()

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `siwe:nonce:${result.nonce}`,
        600, // 10 minutes
        '1'
      )
    })

    it('should generate different nonces on each call', async () => {
      const result1 = await authService.generateNonce()
      const result2 = await authService.generateNonce()

      expect(result1.nonce).not.toBe(result2.nonce)
    })

    it('should generate UUID format nonce', async () => {
      const result = await authService.generateNonce()

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(result.nonce).toMatch(uuidRegex)
    })

    it('should handle Redis errors gracefully', async () => {
      mockRedis.setex = vi.fn().mockRejectedValue(new Error('Redis connection failed'))

      await expect(authService.generateNonce()).rejects.toThrow('Redis connection failed')
    })
  })

  describe('verifySignature', () => {
    const validRequest = {
      message: 'zesty.studio wants you to sign in...',
      signature: '0x' + 'a'.repeat(130),
    }

    it('should verify valid signature and return token with user', async () => {
      const result = await authService.verifySignature(validRequest)

      expect(result).toBeDefined()
      expect(result.token).toBe('mock_jwt_token')
      expect(result.user).toEqual({
        id: 'user_123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
      })
    })

    it('should verify nonce exists and delete it', async () => {
      await authService.verifySignature(validRequest)

      expect(mockRedis.del).toHaveBeenCalledWith('siwe:nonce:test-nonce-123')
    })

    it('should throw INVALID_NONCE if nonce does not exist', async () => {
      mockRedis.del = vi.fn().mockResolvedValue(0) // Nonce not found

      await expect(authService.verifySignature(validRequest)).rejects.toThrow('INVALID_NONCE')
    })

    it('should throw SIWE_VALIDATION_FAILED for invalid signature', async () => {
      const { SiweMessage } = await import('siwe')
      ;(SiweMessage as any).mockImplementationOnce(() => ({
        validate: vi.fn().mockRejectedValue(new Error('Invalid signature')),
      }))

      await expect(authService.verifySignature(validRequest)).rejects.toThrow('SIWE_VALIDATION_FAILED')
    })

    it('should validate domain when SIWE_DOMAIN is set', async () => {
      const originalEnv = process.env.SIWE_DOMAIN
      process.env.SIWE_DOMAIN = 'example.com'

      const { SiweMessage } = await import('siwe')
      ;(SiweMessage as any).mockImplementationOnce(() => ({
        validate: vi.fn().mockResolvedValue({
          address: '0x1234567890abcdef1234567890abcdef12345678',
          nonce: 'test-nonce-123',
          domain: 'wrong-domain.com', // Wrong domain
          chainId: 11155111,
        }),
      }))

      await expect(authService.verifySignature(validRequest)).rejects.toThrow('INVALID_DOMAIN')

      process.env.SIWE_DOMAIN = originalEnv
    })

    it('should not validate domain when SIWE_DOMAIN is not set', async () => {
      const originalEnv = process.env.SIWE_DOMAIN
      delete process.env.SIWE_DOMAIN

      const { SiweMessage } = await import('siwe')
      ;(SiweMessage as any).mockImplementationOnce(() => ({
        validate: vi.fn().mockResolvedValue({
          address: '0x1234567890abcdef1234567890abcdef12345678',
          nonce: 'test-nonce-123',
          domain: 'any-domain.com', // Should accept any domain
          chainId: 11155111,
        }),
      }))

      const result = await authService.verifySignature(validRequest)
      expect(result).toBeDefined()

      if (originalEnv) {
        process.env.SIWE_DOMAIN = originalEnv
      }
    })

    it('should normalize address to lowercase', async () => {
      const { SiweMessage } = await import('siwe')
      ;(SiweMessage as any).mockImplementationOnce(() => ({
        validate: vi.fn().mockResolvedValue({
          address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12', // Uppercase
          nonce: 'test-nonce-123',
          domain: 'zesty.studio',
          chainId: 11155111,
        }),
      }))

      await authService.verifySignature(validRequest)

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { address: '0xabcdef1234567890abcdef1234567890abcdef12' }, // Lowercase
        update: expect.any(Object),
        create: { address: '0xabcdef1234567890abcdef1234567890abcdef12' },
        select: expect.any(Object),
      })
    })

    it('should create new user if not exists', async () => {
      await authService.verifySignature(validRequest)

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { address: '0x1234567890abcdef1234567890abcdef12345678' },
        update: { updatedAt: expect.any(Date) },
        create: { address: '0x1234567890abcdef1234567890abcdef12345678' },
        select: { id: true, address: true },
      })
    })

    it('should update existing user timestamp', async () => {
      await authService.verifySignature(validRequest)

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { updatedAt: expect.any(Date) },
        })
      )
    })

    it('should handle database errors', async () => {
      mockPrisma.user.upsert = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(authService.verifySignature(validRequest)).rejects.toThrow('Database error')
    })

    it('should handle concurrent nonce usage correctly', async () => {
      // Mock Redis.del to return 1 first time, 0 second time (nonce consumed)
      mockRedis.del = vi.fn()
        .mockResolvedValueOnce(1)  // First call succeeds
        .mockResolvedValueOnce(0)  // Second call fails (nonce already used)

      // Start both verifications concurrently
      const result1 = authService.verifySignature(validRequest)
      const result2 = authService.verifySignature(validRequest)

      await expect(result1).resolves.toBeDefined()
      await expect(result2).rejects.toThrow('INVALID_NONCE')
    })
  })

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const user = await authService.getUserById('user_123')

      expect(user).toBeDefined()
      expect(user!.id).toBe('user_123')
      expect(user!.address).toBe('0x1234567890abcdef1234567890abcdef12345678')
    })

    it('should return null if user not found', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue(null)

      const user = await authService.getUserById('non_existent_user')

      expect(user).toBeNull()
    })

    it('should return all user fields', async () => {
      const user = await authService.getUserById('user_123')

      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('address')
      expect(user).toHaveProperty('farcasterFid')
      expect(user).toHaveProperty('farcasterName')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('inviteCode')
      expect(user).toHaveProperty('createdAt')
      expect(user).toHaveProperty('updatedAt')
    })

    it('should query with correct user ID', async () => {
      await authService.getUserById('test_user_id')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'test_user_id' },
        select: {
          id: true,
          address: true,
          farcasterFid: true,
          farcasterName: true,
          email: true,
          inviteCode: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    })

    it('should handle database errors', async () => {
      mockPrisma.user.findUnique = vi.fn().mockRejectedValue(new Error('Database error'))

      await expect(authService.getUserById('user_123')).rejects.toThrow('Database error')
    })

    it('should handle users with optional fields populated', async () => {
      mockPrisma.user.findUnique = vi.fn().mockResolvedValue({
        id: 'user_123',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        farcasterFid: 12345,
        farcasterName: 'testuser',
        email: 'test@example.com',
        inviteCode: 'ABC123',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-02'),
      })

      const user = await authService.getUserById('user_123')

      expect(user!.farcasterFid).toBe(12345)
      expect(user!.farcasterName).toBe('testuser')
      expect(user!.email).toBe('test@example.com')
    })
  })

  describe('nonce management', () => {
    it('should use correct Redis key prefix', async () => {
      const result = await authService.generateNonce()

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('siwe:nonce:'),
        expect.any(Number),
        expect.any(String)
      )
    })

    it('should use 10-minute TTL for nonces', async () => {
      await authService.generateNonce()

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.any(String),
        600, // 10 minutes = 600 seconds
        expect.any(String)
      )
    })

    it('should delete nonce after successful verification', async () => {
      const validRequest = {
        message: 'test message',
        signature: '0x' + 'a'.repeat(130),
      }

      await authService.verifySignature(validRequest)

      expect(mockRedis.del).toHaveBeenCalledTimes(1)
      expect(mockRedis.del).toHaveBeenCalledWith('siwe:nonce:test-nonce-123')
    })
  })
})
