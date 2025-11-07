import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const plugin: FastifyPluginAsync = async (app) => {
  // GET /api/leaderboard?type=luck&range=week
  app.get('/api/leaderboard', async (req, reply) => {
    try {
      // 先解析查询参数（允许前端格式）
      const query = z
        .object({
          type: z.enum(['luck', 'generous', 'active', 'channel']),
          range: z.enum(['24h', '7d', '30d', 'all', 'week', 'month', 'realtime']).optional(),
        })
        .parse(req.query as any)

      const { type } = query
      const frontendRange = query.range

      // Map frontend range to backend range (在验证之前映射)
      const rangeMap: Record<string, string> = {
        '24h': 'realtime',
        '7d': 'week',
        '30d': 'month',
        'all': 'month',
      }
      const backendRange = frontendRange ? (rangeMap[frontendRange] || frontendRange) : 'week'

      const key = `lb:${type}:${backendRange}`
      
      // 检查 Redis 连接
      if (!app.redis) {
        app.log.warn('Redis not available, returning empty leaderboard')
        return { type, range: frontendRange || '7d', top: [] }
      }

      const rawTop = await app.redis.zrevrange(key, 0, 49, 'WITHSCORES')
      
      // 如果没有数据，返回空列表
      if (!rawTop || rawTop.length === 0) {
        return { type, range: frontendRange || '7d', top: [] }
      }
      
      // 将 Redis 的 [member, score, member, score, ...] 格式转换为对象数组
      const userIds: string[] = []
      const scores: string[] = []
      for (let i = 0; i < rawTop.length; i += 2) {
        if (rawTop[i] && rawTop[i + 1]) {
          userIds.push(rawTop[i] as string)
          scores.push(rawTop[i + 1] as string)
        }
      }

      // 如果没有有效的用户 ID，返回空列表
      if (userIds.length === 0) {
        return { type, range: frontendRange || '7d', top: [] }
      }

      // 批量获取用户信息（地址、Farcaster 名称等）
      let users: any[] = []
      try {
        users = await app.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            address: true,
            farcasterName: true,
            farcasterFid: true,
          },
        })
      } catch (dbError: any) {
        app.log.error({ error: dbError }, 'Failed to fetch users from database')
        // 如果数据库查询失败，仍然返回排行榜数据，只是没有用户详细信息
        users = []
      }

      const userMap = new Map(users.map((u) => [u.id, u]))

      // 构建返回数据，保持排序
      const top = userIds.map((userId, index) => {
        const user = userMap.get(userId)
        return {
          rank: index + 1,
          address: user?.address || userId,
          farcasterName: user?.farcasterName || null,
          farcasterFid: user?.farcasterFid || null,
          score: scores[index] || '0',
          userId,
        }
      })

      return { type, range: frontendRange || '7d', top }
    } catch (error: any) {
      app.log.error({ error, query: req.query }, 'Leaderboard endpoint error')
      
      // 如果是 Zod 验证错误，返回 400
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        })
      }
      
      // 其他错误返回 500
      return reply.code(500).send({
        error: 'INTERNAL_ERROR',
        message: error.message || 'Failed to fetch leaderboard',
      })
    }
  })
}

export default plugin


