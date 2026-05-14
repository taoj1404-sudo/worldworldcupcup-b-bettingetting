import {
  pgTable,
  serial,
  varchar,
  text,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── 投注类型枚举 ─────────────────────────────────────────────
export const betTypeCategoryEnum = pgEnum('bet_type_category', [
  'result',       // 胜平负
  'handicap',     // 让球
  'over_under',   // 大小球
  'exact_score',  // 波胆（精确比分）
  'half_full',    // 半场/全场
  'both_score',   // 双方得分
  'special',      // 特殊玩法
])

// ─── 投注类型表 ──────────────────────────────────────────────
// 这是全局配置表，定义平台支持的所有投注玩法
export const betTypes = pgTable(
  'bet_types',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(), // 如 "result_1x2"
    name: varchar('name', { length: 100 }).notNull(),         // 如 "胜平负"
    nameEn: varchar('name_en', { length: 100 }),              // 英文名
    category: betTypeCategoryEnum('category').notNull(),
    description: text('description'),
    isActive: text('is_active').default('true').notNull(),    // 是否启用
    sortOrder: serial('sort_order'),                          // 显示排序

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('bet_types_code_idx').on(table.code),
    index('bet_types_category_idx').on(table.category),
  ]
)

export type BetType = typeof betTypes.$inferSelect
export type NewBetType = typeof betTypes.$inferInsert
