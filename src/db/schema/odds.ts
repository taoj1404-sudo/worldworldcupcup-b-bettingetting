import {
  pgTable,
  serial,
  integer,
  varchar,
  numeric,
  boolean,
  pgEnum,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { matches } from './matches'
import { betTypes } from './betTypes'

// ─── 枚举 ─────────────────────────────────────────────────────
export const oddsStatusEnum = pgEnum('odds_status', [
  'active',    // 开放投注
  'suspended', // 暂停投注（赛前临时关闭）
  'closed',    // 已关闭（开赛后）
])

// ─── 赔率表 ──────────────────────────────────────────────────
// 每场比赛 × 每种投注类型 × 每个选项 = 一条赔率记录
// 例：比赛#1 胜平负 主胜 @1.85
export const odds = pgTable(
  'odds',
  {
    id: serial('id').primaryKey(),

    // 外键
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    betTypeId: integer('bet_type_id')
      .notNull()
      .references(() => betTypes.id, { onDelete: 'restrict' }),

    // 选项标识，如 "home" | "draw" | "away" | "over" | "under" | "1:0" 等
    option: varchar('option', { length: 50 }).notNull(),
    // 选项展示名称，如 "主胜" | "平局" | "客胜"
    optionLabel: varchar('option_label', { length: 100 }).notNull(),

    // 赔率值（欧赔，保留 4 位小数，如 1.8500）
    value: numeric('value', { precision: 8, scale: 4 }).notNull(),

    // 让球值（让球玩法用，如 -0.5、+1.5）
    handicap: numeric('handicap', { precision: 5, scale: 2 }),

    // 大小球基准值（大小球玩法用，如 2.5）
    line: numeric('line', { precision: 5, scale: 2 }),

    status: oddsStatusEnum('status').default('active').notNull(),

    // 赔率锁定（结算后锁定，不允许修改）
    isLocked: boolean('is_locked').default(false).notNull(),

    // 赔率上次更新时间
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('odds_match_id_idx').on(table.matchId),
    index('odds_match_bet_type_idx').on(table.matchId, table.betTypeId),
    index('odds_status_idx').on(table.status),
  ]
)

// ─── 赔率变动历史表 ───────────────────────────────────────────
// 记录每次赔率调整，用于审计和监控
export const oddsHistory = pgTable(
  'odds_history',
  {
    id: serial('id').primaryKey(),
    oddsId: integer('odds_id')
      .notNull()
      .references(() => odds.id, { onDelete: 'cascade' }),
    oldValue: numeric('old_value', { precision: 8, scale: 4 }).notNull(),
    newValue: numeric('new_value', { precision: 8, scale: 4 }).notNull(),
    changedBy: integer('changed_by'), // admin user_id，NULL 表示系统自动
    reason: varchar('reason', { length: 255 }),
    changedAt: timestamp('changed_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('odds_history_odds_id_idx').on(table.oddsId),
    index('odds_history_changed_at_idx').on(table.changedAt),
  ]
)

// ─── Relations ──────────────────────────────────────────────
export const oddsRelations = relations(odds, ({ one, many }) => ({
  match: one(matches, { fields: [odds.matchId], references: [matches.id] }),
  betType: one(betTypes, { fields: [odds.betTypeId], references: [betTypes.id] }),
  history: many(oddsHistory),
}))

export type Odds = typeof odds.$inferSelect
export type NewOdds = typeof odds.$inferInsert
export type OddsHistory = typeof oddsHistory.$inferSelect
