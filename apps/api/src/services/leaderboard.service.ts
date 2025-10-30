import type { Redis } from 'ioredis'

export async function zaddScore(redis: Redis, key: string, member: string, score: number) {
  await redis.zadd(key, score, member)
}

export async function top(redis: Redis, key: string, limit = 50) {
  return redis.zrevrange(key, 0, limit - 1, 'WITHSCORES')
}


