/**
 * @file SIWE Authentication Service
 * @description Sign-In with Ethereum authentication logic
 */

import { SiweMessage } from 'siwe'
import type { Redis } from 'ioredis'
import type { PrismaClient } from '@prisma/client'
import type {
  NonceResponse,
  VerifyRequest,
  VerifyResponse,
  SIWEValidationResult
} from '../types/auth.types'
import { jwtService } from './jwt.service'

export class AuthService {
  private readonly NONCE_PREFIX = 'siwe:nonce:'
  private readonly NONCE_TTL = 600 // 10 minutes in seconds

  constructor(
    private redis: Redis,
    private prisma: PrismaClient
  ) {}

  /**
   * Generate a new nonce for SIWE authentication
   * @returns Nonce response with UUID
   */
  async generateNonce(): Promise<NonceResponse> {
    const nonce = crypto.randomUUID()
    const key = `${this.NONCE_PREFIX}${nonce}`

    // Store nonce in Redis with 10-minute TTL
    await this.redis.setex(key, this.NONCE_TTL, '1')

    return { nonce }
  }

  /**
   * Verify SIWE signature and issue JWT token
   * @param request - SIWE message and signature
   * @returns JWT token and user info
   * @throws Error if verification fails
   */
  async verifySignature(request: VerifyRequest): Promise<VerifyResponse> {
    const { message, signature } = request

    // Parse and validate SIWE message
    const siweMessage = new SiweMessage(message)
    let fields: SIWEValidationResult

    try {
      fields = (await siweMessage.validate(signature)) as SIWEValidationResult
    } catch (error) {
      throw new Error('SIWE_VALIDATION_FAILED')
    }

    // Validate domain if configured
    const expectedDomain = process.env.SIWE_DOMAIN
    if (expectedDomain && fields.domain !== expectedDomain) {
      throw new Error('INVALID_DOMAIN')
    }

    // Verify nonce exists and delete it (one-time use)
    const nonceKey = `${this.NONCE_PREFIX}${fields.nonce}`
    const nonceExists = await this.redis.del(nonceKey)

    if (nonceExists === 0) {
      throw new Error('INVALID_NONCE')
    }

    // Normalize address to lowercase
    const address = fields.address.toLowerCase()

    // Upsert user in database
    const user = await this.prisma.user.upsert({
      where: { address },
      update: { updatedAt: new Date() },
      create: { address },
      select: {
        id: true,
        address: true
      },
    })

    // Generate JWT token
    const token = jwtService.generateToken({
      userId: user.id,
      address: user.address,
    })

    return {
      token,
      user: {
        id: user.id,
        address: user.address,
      },
    }
  }

  /**
   * Get user by ID
   * @param userId - User ID from JWT
   * @returns User object or null
   */
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
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
  }
}
