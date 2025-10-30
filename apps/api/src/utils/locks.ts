import type { Redis } from 'ioredis'

export async function withLock<T>(redis: Redis, key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const lockKey = `lock:${key}`
  const locked = await redis.set(lockKey, '1', 'EX', ttlSeconds, 'NX')
  if (locked !== 'OK') {
    throw new Error('LOCKED')
  }
  try {
    return await fn()
  } finally {
    await redis.del(lockKey)
  }
}


