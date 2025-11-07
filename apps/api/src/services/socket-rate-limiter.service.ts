/**
 * @file Socket Rate Limiter Service
 * @description Handle Socket.IO connection rate limiting and concurrent connection control
 */

import { createClient, type RedisClientType } from 'redis'

// Rate limit configurations
const IP_RATE_LIMIT = 10 // Max connections per IP per minute
const USER_RATE_LIMIT = 5 // Max connections per user per minute
const MAX_CONCURRENT_CONNECTIONS = 3 // Max concurrent connections per user
const BAN_DURATION = 300 // Ban duration in seconds (5 minutes)
const RATE_LIMIT_WINDOW = 60 // Rate limit window in seconds (1 minute)

export interface RateLimitResult {
  allowed: boolean
  retryAfter?: number // Seconds until retry is allowed
  current?: number // Current count
  max?: number // Maximum allowed
}

export class SocketRateLimiterService {
  private redis: RedisClientType

  constructor(redisUrl?: string) {
    this.redis = createClient({
      url: redisUrl || process.env.REDIS_URL,
    })
  }

  async connect() {
    await this.redis.connect()
  }

  async disconnect() {
    await this.redis.disconnect()
  }

  /**
   * Check if IP is within rate limit
   */
  async checkIpRateLimit(ip: string): Promise<RateLimitResult> {
    try {
      // Check if IP is banned
      const isBanned = await this.isIpBanned(ip)
      if (isBanned) {
        const ttl = await this.redis.ttl(`socket:banned:${ip}`)
        return {
          allowed: false,
          retryAfter: ttl > 0 ? ttl : BAN_DURATION,
        }
      }

      // Check rate limit
      const key = `socket:ip-limit:${ip}`
      const count = await this.redis.incr(key)

      // Set expiration on first request
      if (count === 1) {
        await this.redis.expire(key, RATE_LIMIT_WINDOW)
      }

      const allowed = count <= IP_RATE_LIMIT

      // Auto-ban if exceeding limit significantly
      if (count > IP_RATE_LIMIT * 2) {
        await this.banIp(ip, BAN_DURATION)
        console.warn(`IP ${ip} auto-banned for excessive connections (${count} attempts)`)
      }

      return {
        allowed,
        current: count,
        max: IP_RATE_LIMIT,
        retryAfter: allowed ? undefined : RATE_LIMIT_WINDOW,
      }
    } catch (error) {
      console.error('Failed to check IP rate limit:', error)
      // Fail open to avoid blocking legitimate users
      return { allowed: true }
    }
  }

  /**
   * Check if user is within rate limit
   */
  async checkUserRateLimit(userId: string): Promise<RateLimitResult> {
    try {
      const key = `socket:user-limit:${userId}`
      const count = await this.redis.incr(key)

      // Set expiration on first request
      if (count === 1) {
        await this.redis.expire(key, RATE_LIMIT_WINDOW)
      }

      const allowed = count <= USER_RATE_LIMIT

      return {
        allowed,
        current: count,
        max: USER_RATE_LIMIT,
        retryAfter: allowed ? undefined : RATE_LIMIT_WINDOW,
      }
    } catch (error) {
      console.error('Failed to check user rate limit:', error)
      return { allowed: true }
    }
  }

  /**
   * Check concurrent connections for a user
   */
  async checkConcurrentConnections(userId: string): Promise<RateLimitResult> {
    try {
      const key = `socket:connections:${userId}`
      const count = await this.redis.sCard(key)

      const allowed = count < MAX_CONCURRENT_CONNECTIONS

      return {
        allowed,
        current: count,
        max: MAX_CONCURRENT_CONNECTIONS,
      }
    } catch (error) {
      console.error('Failed to check concurrent connections:', error)
      return { allowed: true }
    }
  }

  /**
   * Record a new connection
   */
  async recordConnection(ip: string, userId: string, socketId: string): Promise<void> {
    try {
      const key = `socket:connections:${userId}`

      // Add socket ID to user's connection set
      await this.redis.sAdd(key, socketId)

      // Set TTL to auto-cleanup stale connections (1 hour)
      await this.redis.expire(key, 3600)

      // Store socket-to-user mapping for cleanup
      await this.redis.set(`socket:user:${socketId}`, userId, {
        EX: 3600, // 1 hour
      })
    } catch (error) {
      console.error('Failed to record connection:', error)
    }
  }

  /**
   * Remove a connection
   */
  async removeConnection(userId: string, socketId: string): Promise<void> {
    try {
      const key = `socket:connections:${userId}`
      await this.redis.sRem(key, socketId)
      await this.redis.del(`socket:user:${socketId}`)
    } catch (error) {
      console.error('Failed to remove connection:', error)
    }
  }

  /**
   * Get oldest connection for a user (to disconnect if limit exceeded)
   */
  async getOldestConnection(userId: string): Promise<string | null> {
    try {
      const key = `socket:connections:${userId}`
      const members = await this.redis.sMembers(key)

      // Return first member (oldest by insertion order in practice)
      return members[0] || null
    } catch (error) {
      console.error('Failed to get oldest connection:', error)
      return null
    }
  }

  /**
   * Ban an IP address
   */
  async banIp(ip: string, duration: number = BAN_DURATION): Promise<void> {
    try {
      const key = `socket:banned:${ip}`
      await this.redis.set(key, '1', {
        EX: duration,
      })
      console.info(`IP ${ip} banned for ${duration} seconds`)
    } catch (error) {
      console.error('Failed to ban IP:', error)
    }
  }

  /**
   * Check if an IP is banned
   */
  async isIpBanned(ip: string): Promise<boolean> {
    try {
      const key = `socket:banned:${ip}`
      const result = await this.redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Failed to check IP ban status:', error)
      return false
    }
  }

  /**
   * Unban an IP address (manual intervention)
   */
  async unbanIp(ip: string): Promise<void> {
    try {
      const key = `socket:banned:${ip}`
      await this.redis.del(key)
      console.info(`IP ${ip} unbanned`)
    } catch (error) {
      console.error('Failed to unban IP:', error)
    }
  }

  /**
   * Get real-time statistics
   */
  async getStats(): Promise<{
    totalConnections: number
    bannedIps: number
  }> {
    try {
      // Count all connection sets
      const keys = await this.redis.keys('socket:connections:*')
      let totalConnections = 0

      for (const key of keys) {
        const count = await this.redis.sCard(key)
        totalConnections += count
      }

      // Count banned IPs
      const bannedKeys = await this.redis.keys('socket:banned:*')
      const bannedIps = bannedKeys.length

      return {
        totalConnections,
        bannedIps,
      }
    } catch (error) {
      console.error('Failed to get stats:', error)
      return {
        totalConnections: 0,
        bannedIps: 0,
      }
    }
  }
}
