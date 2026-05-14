import {
  pgTable,
  serial,
  integer,
  numeric,
  varchar,
  text,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { matches } from './matches'

// ─── 枚举 ─────────────────────────────────────────────────────
export const settlementStatusEnum = pgEnum('settlement_status', [
  'pending',    // 等待结算
  'processing', // 结算中（防止并发重复结算）
  'completed',  // 结算完成
  'failed',     // 结算失败（需人工介入）
])

// ─── 结算记录表 ──────────────────────────────────────────────
export const settlements = pgTable(
  'settlements',
  {
    id: serial('id').primaryKey(),

    matchId: integer('match_id')
      .notNull()
      .unique() // 每场比赛只能有一条结算记录
      .references(() => matches.id, { onDelete: 'restrict' }),

    status: settlementStatusEnum('status').default('pending').notNull(),

    // 结算用的最终比分（以此为准）
    finalScoreHome: integer('final_score_home').notNull(),
    finalScoreAway: integer('final_score_away').notNull(),

    // 统计汇总
    totalBetsCount: integer('total_bets_count').default(0).notNull(),
    wonBetsCount: integer('won_bets_count').default(0).notNull(),
    lostBetsCount: integer('lost_bets_count').default(0).notNull(),
    voidBetsCount: integer('void_bets_count').default(0).notNull(),

    // 金额汇总（单位：分）
    totalStakesCents: numeric('total_stakes_cents', { precision: 18, scale: 0 })
      .default('0')
      .notNull(),
    totalPayoutCents: numeric('total_payout_cents', { precision: 18, scale: 0 })
      .default('0')
      .notNull(),
    // 平台利润 = totalStakesCents - totalPayoutCents
    platformProfitCents: numeric('platform_profit_cents', { precision: 18, scale: 0 })
      .default('0')
      .notNull(),

    // 执行信息
    settledBy: integer('settled_by'), // admin user_id
    settlementNotes: text('settlement_notes'),
    errorMessage: text('error_message'), // 失败时记录错误

    settledAt: timestamp('settled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('settlements_match_id_idx').on(table.matchId),
    index('settlements_status_idx').on(table.status),
    index('settlements_settled_at_idx').on(table.settledAt),
  ]
)

// ─── Relations ──────────────────────────────────────────────
export const settlementsRelations = relations(settlements, ({ one }) => ({
  match: one(matches, { fields: [settlements.matchId], references: [matches.id] }),
}))

export type Settlement = typeof settlements.$inferSelect
export type NewSettlement = typeof settlements.$inferInsert
