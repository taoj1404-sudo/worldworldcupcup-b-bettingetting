import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  // Schema 文件路径
  schema: './src/db/schema/index.ts',

  // 迁移文件输出目录
  out: './src/db/migrations',

  // 数据库方言
  dialect: 'postgresql',

  // 数据库连接（从环境变量读取）
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },

  // 迁移时打印详细日志
  verbose: true,

  // 严格模式：有破坏性变更时需要确认
  strict: true,
})
