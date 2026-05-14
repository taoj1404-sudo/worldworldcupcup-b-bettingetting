import {
  pgTable,
  serial,
  varchar,
  text,
  smallint,
  integer,
  pgEnum,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── 枚举类型 ─────────────────────────────────────────────────────────
export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',  // 未开始
  'live',       // 进行中
  'finished',   // 已结束
  'cancelled',  // 已取消
  'postponed',  // 延期
])

export const matchStageEnum = pgEnum('match_stage', [
  'group_a', 'group_b', 'group_c', 'group_d',
  'group_e', 'group_f', 'group_g', 'group_h',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
])

// ─── 比赛表 ───────────────────────────────────────────────────────────
export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),

    // 队伍信息
    teamHome: varchar('team_home', { length: 100 }).notNull(),
    teamAway: varchar('team_away', { length: 100 }).notNull(),
    teamHomeCode: varchar('team_home_code', { length: 3 }).notNull(),
    teamAwayCode: varchar('team_away_code', { length: 3 }).notNull(),
    teamHomeFlagUrl: varchar('team_home_flag_url', { length: 500 }),
    teamAwayFlagUrl: varchar('team_away_flag_url', { length: 500 }),

    // 比分（NULL 表示未开始）
    scoreHome: smallint('score_home'),
    scoreAway: smallint('score_away'),
    halfScoreHome: smallint('half_score_home'),
    halfScoreAway: smallint('half_score_away'),

    // 比赛状态
    status: matchStatusEnum('status').default('scheduled').notNull(),
    stage: matchStageEnum('stage').notNull(),
    matchMinute: smallint('match_minute'),
    venue: varchar('venue', { length: 255 }),
    city: varchar('city', { length: 100 }),
    country: varchar('country', { length: 100 }),

    // 比赛是否锁定（管理员操作时临时锁定）
    isLocked: boolean('is_locked').default(false).notNull(),

    // 已结算投注计数
    settledBets: integer('settled_bets').default(sql`0`).notNull(),

    // 时间
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),

    // 投注截止时间
    bettingClosesAt: timestamp('betting_closes_at', { withTimezone: true }).notNull(),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('matches_status_idx').on(table.status),
    index('matches_stage_idx').on(table.stage),
    index('matches_scheduled_at_idx').on(table.scheduledAt),
    index('matches_betting_closes_at_idx').on(table.bettingClosesAt),
  ]
)

export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert
