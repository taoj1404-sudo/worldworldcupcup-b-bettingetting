import {
  pgTable,
  serial,
  integer,
  numeric,
  varchar,
  pgEnum,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { users } from './users'
import { matches } from './matches'
import { odds } from './odds'
import { betTypes } from './betTypes'

// ─── 枚举 ─────────────────────────────────────────────────────────────
export const betStatusEnum = pgEnum('bet_status', [
  'pending',   // 待结算（比赛未结束）
  'won',       // 已赢
  'lost',      // 已输
  'void',      // 无效（比赛取消/延期）
  'cancelled', // 用户取消（开赛前可取消）
  'refunded',  // 已退款
])

// ─── 投注表 ──────────────────────────────────────────────────────────
export const bets = pgTable(
  'bets',
  {
    id: serial('id').primaryKey(),

    // 外键
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'restrict' }),
    oddsId: integer('odds_id')
      .notNull()
      .references(() => odds.id, { onDelete: 'restrict' }),

    // 用户选择的选项（如 "home" / "away" / "draw"，对应 odds.option）
    selection: varchar('selection', { length: 50 }).notNull(),

    // 投注金额（单位：分）
    amountCents: numeric('amount_cents', { precision: 15, scale: 0 }).notNull(),

    // 锁定的赔率快照（下注时赔率，与 odds.value 独立，防止后续变更影响结算）
    oddsSnapshot: numeric('odds_snapshot', { precision: 8, scale: 4 }).notNull(),

    // 潜在赔付金额（单位：分） = amountCents × oddsSnapshot，向下取整
    potentialPayoutCents: numeric('potential_payout_cents', {
      precision: 15,
      scale: 0,
    }).notNull(),

    // 实际赔付金额（结算后赋值，单位：分）
    actualPayoutCents: numeric('actual_payout_cents', { precision: 15, scale: 0 }),

    status: betStatusEnum('status').default('pending').notNull(),

    // 幂等键（防止重复提交）
    idempotencyKey: varchar('idempotency_key', { length: 128 }).unique(),

    // IP 地址（风控用）
    clientIp: varchar('client_ip', { length: 45 }),

    // 时间戳
    placedAt: timestamp('placed_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  },
  (table) => [
    index('bets_user_id_idx').on(table.userId),
    index('bets_match_id_idx').on(table.matchId),
    index('bets_status_idx').on(table.status),
    index('bets_placed_at_idx').on(table.placedAt),
    // 复合索引：用户 + 状态，常用于"我的投注"页面
    index('bets_user_status_idx').on(table.userId, table.status),
    // 唯一幂等键索引
    uniqueIndex('bets_idempotency_key_idx').on(table.idempotencyKey),
  ]
)

// ─── Relations ────────────────────────────────────────────────────────
export const betsRelations = relations(bets, ({ one }) => ({
  user: one(users, { fields: [bets.userId], references: [users.id] }),
  match: one(matches, { fields: [bets.matchId], references: [matches.id] }),
  odds: one(odds, { fields: [bets.oddsId], references: [odds.id] }),
}))

export type Bet = typeof bets.$inferSelect
export type NewBet = typeof bets.$inferInsert
