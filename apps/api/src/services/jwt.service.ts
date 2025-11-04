/**
 * @file JWT Service
 * @description JWT token generation and verification service
 */

import jwt from 'jsonwebtoken'
import type { JWTPayload } from '../types/auth.types'

export class JWTService {
  private readonly secret: string
  private readonly expiresIn: string

  constructor(secret?: string, expiresIn?: string) {
    this.secret = secret || process.env.JWT_SECRET || 'dev_secret_change_me'
    this.expiresIn = expiresIn || process.env.JWT_EXPIRES_IN || '7d'

    if (this.secret === 'dev_secret_change_me' && process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment')
    }
  }

  /**
   * Generate JWT token from payload
   * @param payload - JWT payload containing userId and address
   * @returns JWT token string
   */
  generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    })
  }

  /**
   * Verify and decode JWT token
   * @param token - JWT token string
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as JWTPayload
      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_TOKEN')
      }
      throw new Error('TOKEN_VERIFICATION_FAILED')
    }
  }

  /**
   * Decode JWT token without verification (for debugging)
   * @param token - JWT token string
   * @returns Decoded JWT payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload
    } catch {
      return null
    }
  }
}

// Singleton instance
export const jwtService = new JWTService()
