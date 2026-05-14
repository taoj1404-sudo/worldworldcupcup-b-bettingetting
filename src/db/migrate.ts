import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

async function runMigrations() {
  console.log('🚀 开始执行数据库迁移...')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const db = drizzle(pool)

  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    console.log('✅ 数据库迁移完成')
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()
