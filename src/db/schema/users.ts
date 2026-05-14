import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  pgEnum,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── 枚举类型 ───────────────────────────────────────────────
export const userRoleEnum = pgEnum('user_role', ['user', 'admin'])
export const userStatusEnum = pgEnum('user_status', ['active', 'frozen', 'pending'])

// ─── 用户表 ─────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('user').notNull(),
    status: userStatusEnum('status').default('active').notNull(),

    // 账户余额（单位：分，避免浮点误差）
    balanceCents: numeric('balance_cents', { precision: 15, scale: 0 })
      .default('0')
      .notNull(),

    // 统计汇总（冗余字段，提升查询效率）
    totalBets: numeric('total_bets', { precision: 10, scale: 0 }).default('0').notNull(),
    totalWonCents: numeric('total_won_cents', { precision: 15, scale: 0 }).default('0').notNull(),
    totalLostCents: numeric('total_lost_cents', { precision: 15, scale: 0 }).default('0').notNull(),

    // 手机号（可选，用于支付绑定）
    phone: varchar('phone', { length: 20 }),
    isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),

    // 时间戳
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_username_idx').on(table.username),
    index('users_role_idx').on(table.role),
    index('users_status_idx').on(table.status),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
