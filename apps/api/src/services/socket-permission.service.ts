/**
 * @file Socket Permission Service
 * @description Handle Socket.IO room access permissions and subscription limits
 */

import type { PrismaClient } from '@prisma/client'
import { createClient, type RedisClientType } from 'redis'

export interface PacketPermission {
  canView: boolean // Can view packet info
  canViewStats: boolean // Can view statistics (creator only)
  canViewClaims: boolean // Can view claim records
}

const MAX_ROOM_SUBSCRIPTIONS = 50 // Max rooms per user
const SUBSCRIPTION_TTL = 3600 // 1 hour

export class SocketPermissionService {
  private redis: RedisClientType
  private prisma: PrismaClient

  constructor(prisma: PrismaClient, redisUrl?: string) {
    this.prisma = prisma
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
   * Check if user has permission to access a packet
   */
  async checkPacketAccess(userId: string, packetId: string): Promise<PacketPermission> {
    try {
      // Fetch packet and check if user has claimed it
      const [packet, claim] = await Promise.all([
        this.prisma.packet.findUnique({
          where: { packetId },
          select: {
            id: true,
            creatorId: true,
            expireTime: true,
          },
        }),
        this.prisma.packetClaim.findFirst({
          where: {
            packet: { packetId },
            claimerId: userId,
          },
        }),
      ])

      if (!packet) {
        return { canView: false, canViewStats: false, canViewClaims: false }
      }

      const isCreator = packet.creatorId === userId
      const hasClaimed = !!claim

      return {
        canView: true, // Everyone can view public packets
        canViewStats: isCreator, // Only creator can view stats
        canViewClaims: isCreator || hasClaimed, // Creator or claimers can view claims
      }
    } catch (error) {
      console.error('Failed to check packet access:', error)
      return { canView: false, canViewStats: false, canViewClaims: false }
    }
  }

  /**
   * Check if user can subscribe to more rooms
   */
  async canSubscribeToRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const key = `socket:subscriptions:${userId}`
      const subscriptions = await this.redis.sMembers(key)

      // Already subscribed
      if (subscriptions.includes(roomId)) {
        return true
      }

      // Check limit
      if (subscriptions.length >= MAX_ROOM_SUBSCRIPTIONS) {
        console.warn(`User ${userId} exceeded room subscription limit`)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to check subscription limit:', error)
      return false
    }
  }

  /**
   * Record a room subscription
   */
  async recordRoomSubscription(userId: string, roomId: string): Promise<void> {
    try {
      const key = `socket:subscriptions:${userId}`

      // Add to set
      await this.redis.sAdd(key, roomId)

      // Set TTL (refresh on each subscription)
      await this.redis.expire(key, SUBSCRIPTION_TTL)
    } catch (error) {
      console.error('Failed to record room subscription:', error)
    }
  }

  /**
   * Remove a room subscription
   */
  async removeRoomSubscription(userId: string, roomId: string): Promise<void> {
    try {
      const key = `socket:subscriptions:${userId}`
      await this.redis.sRem(key, roomId)
    } catch (error) {
      console.error('Failed to remove room subscription:', error)
    }
  }

  /**
   * Get user's active room subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<string[]> {
    try {
      const key = `socket:subscriptions:${userId}`
      return await this.redis.sMembers(key)
    } catch (error) {
      console.error('Failed to get user subscriptions:', error)
      return []
    }
  }

  /**
   * Clear all room subscriptions for a user
   */
  async clearUserSubscriptions(userId: string): Promise<void> {
    try {
      const key = `socket:subscriptions:${userId}`
      await this.redis.del(key)
    } catch (error) {
      console.error('Failed to clear user subscriptions:', error)
    }
  }
}
