/**
 * @file Socket Audit Service
 * @description Handle Socket.IO security event logging and anomaly detection
 */

import type { PrismaClient } from '@prisma/client'

export enum SecurityEventType {
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILED = 'auth_failed',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CONNECTION_REJECTED = 'connection_rejected',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CONCURRENT_LIMIT_EXCEEDED = 'concurrent_limit_exceeded',
}

export interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  socketId: string
  ip: string
  userAgent?: string
  details?: Record<string, any>
}

// Thresholds for suspicious activity detection
const SUSPICIOUS_THRESHOLDS = {
  AUTH_FAILURES_PER_HOUR: 10, // Max auth failures per IP per hour
  PERMISSION_DENIALS_PER_HOUR: 20, // Max permission denials per user per hour
  RAPID_RECONNECTS: 5, // Max reconnects per minute
}

export class SocketAuditService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.prisma.socketSecurityEvent.create({
        data: {
          type: event.type,
          userId: event.userId,
          socketId: event.socketId,
          ip: event.ip,
          userAgent: event.userAgent,
          details: event.details || {},
        },
      })

      // Check for suspicious activity after logging
      if (
        event.type === SecurityEventType.AUTH_FAILED ||
        event.type === SecurityEventType.PERMISSION_DENIED
      ) {
        const isSuspicious = await this.detectSuspiciousActivity(
          event.userId || event.ip,
          event.ip
        )

        if (isSuspicious) {
          await this.logSecurityEvent({
            type: SecurityEventType.SUSPICIOUS_ACTIVITY,
            userId: event.userId,
            socketId: event.socketId,
            ip: event.ip,
            userAgent: event.userAgent,
            details: {
              reason: 'Excessive failed attempts',
              originalEvent: event.type,
            },
          })
        }
      }
    } catch (error) {
      // Don't let audit logging failures break the application
      console.error('Failed to log security event:', error)
    }
  }

  /**
   * Detect suspicious activity based on recent events
   */
  async detectSuspiciousActivity(userId: string, ip: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      // Count recent auth failures from this IP
      const authFailures = await this.prisma.socketSecurityEvent.count({
        where: {
          ip,
          type: SecurityEventType.AUTH_FAILED,
          createdAt: { gte: oneHourAgo },
        },
      })

      if (authFailures >= SUSPICIOUS_THRESHOLDS.AUTH_FAILURES_PER_HOUR) {
        console.warn(`Suspicious: IP ${ip} has ${authFailures} auth failures in past hour`)
        return true
      }

      // Count recent permission denials for this user
      if (userId) {
        const permissionDenials = await this.prisma.socketSecurityEvent.count({
          where: {
            userId,
            type: SecurityEventType.PERMISSION_DENIED,
            createdAt: { gte: oneHourAgo },
          },
        })

        if (permissionDenials >= SUSPICIOUS_THRESHOLDS.PERMISSION_DENIALS_PER_HOUR) {
          console.warn(
            `Suspicious: User ${userId} has ${permissionDenials} permission denials in past hour`
          )
          return true
        }
      }

      // Check for rapid reconnects
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
      const recentConnections = await this.prisma.socketSecurityEvent.count({
        where: {
          ip,
          type: SecurityEventType.AUTH_SUCCESS,
          createdAt: { gte: oneMinuteAgo },
        },
      })

      if (recentConnections >= SUSPICIOUS_THRESHOLDS.RAPID_RECONNECTS) {
        console.warn(`Suspicious: IP ${ip} has ${recentConnections} connections in past minute`)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error)
      return false
    }
  }

  /**
   * Get user's recent audit log
   */
  async getUserAuditLog(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    try {
      const events = await this.prisma.socketSecurityEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return events.map((event) => ({
        type: event.type as SecurityEventType,
        userId: event.userId || undefined,
        socketId: event.socketId,
        ip: event.ip,
        userAgent: event.userAgent || undefined,
        details: event.details as Record<string, any>,
      }))
    } catch (error) {
      console.error('Failed to get user audit log:', error)
      return []
    }
  }

  /**
   * Get real-time statistics
   */
  async getRealTimeStats(): Promise<{
    totalEvents: number
    authFailures: number
    activeConnections: number
    suspiciousActivities: number
  }> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      const [totalEvents, authFailures, activeConnections, suspiciousActivities] =
        await Promise.all([
          this.prisma.socketSecurityEvent.count({
            where: { createdAt: { gte: oneHourAgo } },
          }),
          this.prisma.socketSecurityEvent.count({
            where: {
              type: SecurityEventType.AUTH_FAILED,
              createdAt: { gte: oneHourAgo },
            },
          }),
          this.prisma.socketSecurityEvent.count({
            where: {
              type: SecurityEventType.AUTH_SUCCESS,
              createdAt: { gte: oneHourAgo },
            },
          }),
          this.prisma.socketSecurityEvent.count({
            where: {
              type: SecurityEventType.SUSPICIOUS_ACTIVITY,
              createdAt: { gte: oneHourAgo },
            },
          }),
        ])

      return {
        totalEvents,
        authFailures,
        activeConnections,
        suspiciousActivities,
      }
    } catch (error) {
      console.error('Failed to get real-time stats:', error)
      return {
        totalEvents: 0,
        authFailures: 0,
        activeConnections: 0,
        suspiciousActivities: 0,
      }
    }
  }

  /**
   * Get events by type for analysis
   */
  async getEventsByType(
    type: SecurityEventType,
    hoursAgo: number = 24
  ): Promise<SecurityEvent[]> {
    try {
      const since = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

      const events = await this.prisma.socketSecurityEvent.findMany({
        where: {
          type,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })

      return events.map((event) => ({
        type: event.type as SecurityEventType,
        userId: event.userId || undefined,
        socketId: event.socketId,
        ip: event.ip,
        userAgent: event.userAgent || undefined,
        details: event.details as Record<string, any>,
      }))
    } catch (error) {
      console.error('Failed to get events by type:', error)
      return []
    }
  }

  /**
   * Clean up old audit logs (should be run periodically)
   */
  async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

      const result = await this.prisma.socketSecurityEvent.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
        },
      })

      console.info(`Cleaned up ${result.count} old security events`)
      return result.count
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
      return 0
    }
  }
}
