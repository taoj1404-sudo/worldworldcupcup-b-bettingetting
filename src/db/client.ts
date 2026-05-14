import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// ─── 数据库连接池 ──────────────────────────────────────────
// 使用连接池避免每次请求都建立新连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // 连接池配置
  max: 20,          // 最大连接数
  idleTimeoutMillis: 30_000,  // 空闲连接超时 30s
  connectionTimeoutMillis: 5_000, // 连接超时 5s
})

// ─── Drizzle 客户端 ───────────────────────────────────────
export const db = drizzle(pool, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// ─── 连接健康检查 ─────────────────────────────────────────
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch (error) {
    console.error('[DB] 连接检查失败:', error)
    return false
  }
}

// ─── 关闭连接池（用于优雅关机）──────────────────────────
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end()
}

export { pool }
export type Database = typeof db
