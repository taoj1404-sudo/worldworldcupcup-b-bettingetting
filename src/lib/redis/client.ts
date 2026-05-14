/**
 * Redis 客户端封装
 *
 * 特性：
 * - 支持 REDIS_URL 环境变量（Docker: redis://redis:6379）
 * - 无 Redis 时优雅降级（返回 null，不影响业务）
 * - 自动重连，断线恢复
 */
import Redis from 'ioredis'

let redis: Redis | null = null
let initError: string | null = null

function createClient(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) {
    initError = 'REDIS_URL not configured'
    return null
  }

  try {
    const client = new Redis(url, {
      // 断线自动重连
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null // 放弃重连
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    })

    client.on('error', (err) => {
      console.warn('[Redis] Connection error:', err.message)
    })

    client.on('connect', () => {
      console.log('[Redis] Connected to', url)
    })

    return client
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err)
    console.warn('[Redis] Failed to create client:', initError)
    return null
  }
}

// 获取 Redis 实例（可用时）
export function getRedis(): Redis | null {
  if (redis === undefined) {
    redis = createClient()
  }
  return redis
}

// 检查 Redis 是否可用
export function isRedisAvailable(): boolean {
  const client = getRedis()
  return client !== null
}

// ─── 缓存工具函数 ──────────────────────────────────────────

export interface CacheOptions {
  /** TTL 秒数，默认 60 */
  ttl?: number
  /** 缓存 key 前缀 */
  prefix?: string
}

const DEFAULT_TTL = 60
const DEFAULT_PREFIX = 'wc'

/**
 * 读取缓存
 * @returns 解析后的对象，或 null（未命中或 Redis 不可用）
 */
export async function cacheGet<T>(key: string, options?: CacheOptions): Promise<T | null> {
  const client = getRedis()
  if (!client) return null

  const fullKey = `${options?.prefix ?? DEFAULT_PREFIX}:${key}`
  try {
    const raw = await client.get(fullKey)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/**
 * 写入缓存
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  options?: CacheOptions
): Promise<void> {
  const client = getRedis()
  if (!client) return

  const fullKey = `${options?.prefix ?? DEFAULT_PREFIX}:${key}`
  const ttl = options?.ttl ?? DEFAULT_TTL
  try {
    await client.setex(fullKey, ttl, JSON.stringify(value))
  } catch (err) {
    console.warn('[Redis] cacheSet failed:', err)
  }
}

/**
 * 删除缓存
 */
export async function cacheDel(key: string, options?: CacheOptions): Promise<void> {
  const client = getRedis()
  if (!client) return

  const fullKey = `${options?.prefix ?? DEFAULT_PREFIX}:${key}`
  try {
    await client.del(fullKey)
  } catch (err) {
    console.warn('[Redis] cacheDel failed:', err)
  }
}

/**
 * 使缓存失效（支持通配符）
 */
export async function cacheInvalidate(pattern: string, options?: CacheOptions): Promise<void> {
  const client = getRedis()
  if (!client) return

  const fullPattern = `${options?.prefix ?? DEFAULT_PREFIX}:${pattern}`
  try {
    const keys = await client.keys(fullPattern)
    if (keys.length > 0) {
      await client.del(...keys)
      console.log(`[Redis] Invalidated ${keys.length} keys matching "${fullPattern}"`)
    }
  } catch (err) {
    console.warn('[Redis] cacheInvalidate failed:', err)
  }
}

// 缓存 key 生成辅助
export const cacheKeys = {
  leaderboard: (limit = 50) => `leaderboard:top:${limit}`,
  matchOdds: (matchId: number) => `odds:match:${matchId}`,
  matchDetail: (matchId: number) => `match:${matchId}`,
  userBalance: (userId: number) => `user:${userId}:balance`,
}
