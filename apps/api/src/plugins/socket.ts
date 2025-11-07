import fp from 'fastify-plugin'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'
import { jwtService } from '../services/jwt.service'
import type { JWTPayload } from '../types/auth.types'
import { SocketRateLimiterService } from '../services/socket-rate-limiter.service'
import { SocketAuditService, SecurityEventType } from '../services/socket-audit.service'
import { SocketPermissionService } from '../services/socket-permission.service'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

// 扩展 Socket 类型以包含用户信息
interface AuthenticatedSocket extends Socket {
  userId?: string
  address?: string
}

export default fp(async (app) => {
  const io = new Server(app.server, {
    cors: { origin: true, credentials: true },
    // 允许从 handshake.auth 或 handshake.query 获取 token
    allowRequest: (req, callback) => {
      // 允许所有连接，在中间件中验证
      callback(null, true)
    },
  })

  const url = process.env.REDIS_URL
  const pub = createClient({ url: url })
  const sub = pub.duplicate()
  await Promise.all([pub.connect(), sub.connect()])
  io.adapter(createAdapter(pub, sub))

  // 初始化安全服务
  const rateLimiter = new SocketRateLimiterService(url)
  const auditService = new SocketAuditService(app.prisma)
  const permissionService = new SocketPermissionService(app.prisma, url)

  await Promise.all([
    rateLimiter.connect(),
    permissionService.connect(),
  ])

  // JWT 认证中间件（带限流和审计）
  io.use(async (socket: AuthenticatedSocket, next) => {
    const ip = socket.handshake.address || 'unknown'
    const userAgent = socket.handshake.headers['user-agent']

    try {
      // 1. 检查 IP 是否被封禁
      const ipBanned = await rateLimiter.isIpBanned(ip)
      if (ipBanned) {
        await auditService.logSecurityEvent({
          type: SecurityEventType.CONNECTION_REJECTED,
          socketId: socket.id,
          ip,
          userAgent,
          details: { reason: 'IP banned' },
        })
        app.log.warn({ ip, socketId: socket.id }, 'Connection rejected: IP banned')
        return next(new Error('CONNECTION_REJECTED'))
      }

      // 2. 检查 IP 速率限制
      const ipLimit = await rateLimiter.checkIpRateLimit(ip)
      if (!ipLimit.allowed) {
        await auditService.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          socketId: socket.id,
          ip,
          userAgent,
          details: {
            reason: 'IP rate limit exceeded',
            current: ipLimit.current,
            max: ipLimit.max,
            retryAfter: ipLimit.retryAfter,
          },
        })
        app.log.warn({ ip, socketId: socket.id, current: ipLimit.current }, 'Connection rejected: IP rate limit')
        return next(new Error('RATE_LIMIT_EXCEEDED'))
      }

      // 3. 从 handshake.auth 或 handshake.query 获取 token
      const token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string)

      if (!token) {
        await auditService.logSecurityEvent({
          type: SecurityEventType.AUTH_FAILED,
          socketId: socket.id,
          ip,
          userAgent,
          details: { reason: 'No token provided' },
        })
        app.log.warn({ socketId: socket.id, ip }, 'Socket connection rejected: No token provided')
        return next(new Error('AUTH_REQUIRED'))
      }

      // 4. 验证 JWT token
      const payload = jwtService.verifyToken(token)
      socket.userId = payload.userId
      socket.address = payload.address

      // 5. 检查用户速率限制
      const userLimit = await rateLimiter.checkUserRateLimit(socket.userId)
      if (!userLimit.allowed) {
        await auditService.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          userId: socket.userId,
          socketId: socket.id,
          ip,
          userAgent,
          details: {
            reason: 'User rate limit exceeded',
            current: userLimit.current,
            max: userLimit.max,
            retryAfter: userLimit.retryAfter,
          },
        })
        app.log.warn({ userId: socket.userId, socketId: socket.id }, 'Connection rejected: User rate limit')
        return next(new Error('RATE_LIMIT_EXCEEDED'))
      }

      // 6. 检查并发连接限制
      const concurrentLimit = await rateLimiter.checkConcurrentConnections(socket.userId)
      if (!concurrentLimit.allowed) {
        // 获取最老的连接并断开
        const oldestSocketId = await rateLimiter.getOldestConnection(socket.userId)
        if (oldestSocketId) {
          const oldSocket = io.sockets.sockets.get(oldestSocketId)
          if (oldSocket) {
            oldSocket.emit('error', {
              type: 'CONCURRENT_LIMIT_EXCEEDED',
              message: 'New connection established, disconnecting this session',
            })
            oldSocket.disconnect(true)
            app.log.info({ oldestSocketId, userId: socket.userId }, 'Disconnected oldest connection due to limit')

            // 从 Redis 中移除旧连接
            await rateLimiter.removeConnection(socket.userId, oldestSocketId)
          }
        }

        await auditService.logSecurityEvent({
          type: SecurityEventType.CONCURRENT_LIMIT_EXCEEDED,
          userId: socket.userId,
          socketId: socket.id,
          ip,
          userAgent,
          details: {
            reason: 'Concurrent connection limit exceeded',
            current: concurrentLimit.current,
            max: concurrentLimit.max,
            oldestDisconnected: oldestSocketId,
          },
        })
      }

      // 7. 记录成功的认证和连接
      await rateLimiter.recordConnection(ip, socket.userId, socket.id)
      await auditService.logSecurityEvent({
        type: SecurityEventType.AUTH_SUCCESS,
        userId: socket.userId,
        socketId: socket.id,
        ip,
        userAgent,
        details: { address: socket.address },
      })

      app.log.info({ userId: payload.userId, socketId: socket.id, ip }, 'Socket authenticated')
      next()
    } catch (error: any) {
      await auditService.logSecurityEvent({
        type: SecurityEventType.AUTH_FAILED,
        userId: socket.userId,
        socketId: socket.id,
        ip,
        userAgent,
        details: { error: error.message },
      })
      app.log.warn({ error: error.message, socketId: socket.id, ip }, 'Socket authentication failed')
      next(new Error(error.message || 'AUTH_FAILED'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.userId) {
      app.log.warn({ socketId: socket.id }, 'Socket connected without userId, disconnecting')
      socket.disconnect()
      return
    }

    // 自动加入用户专属房间
    socket.join(`user:${socket.userId}`)
    app.log.info({ userId: socket.userId, socketId: socket.id }, 'User joined private room')

    // 订阅红包房间（带权限检查和订阅限制）
    socket.on('subscribe:packet', async (packetId: string) => {
      const ip = socket.handshake.address || 'unknown'
      const userAgent = socket.handshake.headers['user-agent']

      try {
        if (!packetId || typeof packetId !== 'string') {
          socket.emit('error', { type: 'INVALID_PACKET_ID', message: 'Invalid packet ID' })
          return
        }

        const roomId = `packet:${packetId}`

        // 1. 检查订阅限制
        const canSubscribe = await permissionService.canSubscribeToRoom(socket.userId!, roomId)
        if (!canSubscribe) {
          await auditService.logSecurityEvent({
            type: SecurityEventType.PERMISSION_DENIED,
            userId: socket.userId!,
            socketId: socket.id,
            ip,
            userAgent,
            details: { reason: 'Room subscription limit exceeded', room: roomId },
          })
          socket.emit('error', {
            type: 'SUBSCRIPTION_LIMIT_EXCEEDED',
            message: 'You have reached the maximum number of room subscriptions',
          })
          return
        }

        // 2. 检查红包是否存在
        const packet = await app.prisma.packet.findUnique({
          where: { packetId },
          select: { id: true, creatorId: true },
        })

        if (!packet) {
          socket.emit('error', { type: 'PACKET_NOT_FOUND', message: 'Packet not found' })
          return
        }

        // 3. 检查用户是否有权限访问
        const permission = await permissionService.checkPacketAccess(socket.userId!, packetId)
        if (!permission.canView) {
          await auditService.logSecurityEvent({
            type: SecurityEventType.PERMISSION_DENIED,
            userId: socket.userId!,
            socketId: socket.id,
            ip,
            userAgent,
            details: { reason: 'No access to packet', packetId },
          })
          socket.emit('error', {
            type: 'PERMISSION_DENIED',
            message: 'You do not have permission to access this packet',
          })
          return
        }

        // 4. 加入房间并记录订阅
        socket.join(roomId)
        await permissionService.recordRoomSubscription(socket.userId!, roomId)
        await auditService.logSecurityEvent({
          type: SecurityEventType.ROOM_JOINED,
          userId: socket.userId!,
          socketId: socket.id,
          ip,
          userAgent,
          details: { room: roomId, packetId },
        })

        app.log.info({ userId: socket.userId, packetId, socketId: socket.id }, 'User subscribed to packet room')

        // 发送确认消息（包含权限信息）
        socket.emit('subscribed', {
          packetId,
          room: roomId,
          permissions: {
            canView: permission.canView,
            canViewStats: permission.canViewStats,
            canViewClaims: permission.canViewClaims,
          },
        })
      } catch (error: any) {
        app.log.error({ error, userId: socket.userId, packetId }, 'Failed to subscribe to packet room')
        socket.emit('error', { type: 'SUBSCRIPTION_ERROR', message: error.message || 'Failed to subscribe' })
      }
    })

    // 取消订阅红包房间
    socket.on('unsubscribe:packet', async (packetId: string) => {
      const ip = socket.handshake.address || 'unknown'
      const userAgent = socket.handshake.headers['user-agent']

      try {
        if (!packetId || typeof packetId !== 'string') {
          socket.emit('error', { type: 'INVALID_PACKET_ID', message: 'Invalid packet ID' })
          return
        }

        const roomId = `packet:${packetId}`

        // 离开房间并移除订阅记录
        socket.leave(roomId)
        await permissionService.removeRoomSubscription(socket.userId!, roomId)
        await auditService.logSecurityEvent({
          type: SecurityEventType.ROOM_LEFT,
          userId: socket.userId!,
          socketId: socket.id,
          ip,
          userAgent,
          details: { room: roomId, packetId },
        })

        app.log.info({ userId: socket.userId, packetId, socketId: socket.id }, 'User unsubscribed from packet room')

        socket.emit('unsubscribed', { packetId })
      } catch (error: any) {
        app.log.error({ error, userId: socket.userId, packetId }, 'Failed to unsubscribe from packet room')
        socket.emit('error', { type: 'UNSUBSCRIPTION_ERROR', message: error.message || 'Failed to unsubscribe' })
      }
    })

    // 订阅用户通知（自动加入，无需额外操作）
    socket.on('subscribe:notifications', () => {
      // 用户已经在 user:${userId} 房间中，无需额外操作
      socket.emit('subscribed', { room: `user:${socket.userId}`, type: 'notifications' })
    })

    // 错误处理
    socket.on('error', (error: any) => {
      app.log.error({ error, userId: socket.userId, socketId: socket.id }, 'Socket error')
    })

    // 断开连接处理
    socket.on('disconnect', async (reason) => {
      try {
        // 清理连接记录
        if (socket.userId) {
          await rateLimiter.removeConnection(socket.userId, socket.id)
          await permissionService.clearUserSubscriptions(socket.userId)
        }

        app.log.info({ userId: socket.userId, socketId: socket.id, reason }, 'User disconnected')
      } catch (error: any) {
        app.log.error({ error, userId: socket.userId, socketId: socket.id }, 'Error during disconnect cleanup')
      }
    })

    // Ping/Pong 保持连接
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() })
    })
  })

  app.decorate('io', io)
  app.addHook('onClose', async () => {
    await rateLimiter.disconnect()
    await permissionService.disconnect()
    await pub.disconnect()
    await sub.disconnect()
    io.close()
  })
})


