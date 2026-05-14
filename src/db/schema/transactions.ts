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
import { users } from './users'
import { bets } from './bets'
import { wallets } from './wallets'

// ─── 枚举 ─────────────────────────────────────────────────────
export const transactionTypeEnum = pgEnum('transaction_type', [
  'deposit',          // 充值
  'withdraw',         // 提现
  'bet_place',        // 下注扣款
  'bet_win',          // 赢得奖金
  'bet_refund',       // 投注退款（无效比赛）
  'admin_credit',     // 管理员充值
  'admin_debit',      // 管理员扣款
  'bonus',            // 奖励金
])

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',    // 处理中
  'completed',  // 已完成
  'failed',     // 失败
  'cancelled',  // 已取消
])

// ─── 账户流水表 ──────────────────────────────────────────────
export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    type: transactionTypeEnum('type').notNull(),
    status: transactionStatusEnum('status').default('completed').notNull(),

    // 金额（单位：分，始终为正数）
    amountCents: numeric('amount_cents', { precision: 15, scale: 0 }).notNull(),

    // 交易前后余额快照（用于审计和问题排查）
    balanceBeforeCents: numeric('balance_before_cents', {
      precision: 15,
      scale: 0,
    }).notNull(),
    balanceAfterCents: numeric('balance_after_cents', {
      precision: 15,
      scale: 0,
    }).notNull(),

    // 关联钱包
    walletId: integer('wallet_id').references(() => wallets.id, { onDelete: 'cascade' }),

    // 关联投注（投注相关交易）
    betId: integer('bet_id').references(() => bets.id, { onDelete: 'set null' }),

    // 外部支付单号（充值/提现时对应支付宝/微信流水号）
    externalOrderId: varchar('external_order_id', { length: 128 }),

    remark: text('remark'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.userId),
    index('transactions_type_idx').on(table.type),
    index('transactions_status_idx').on(table.status),
    index('transactions_created_at_idx').on(table.createdAt),
    index('transactions_user_type_idx').on(table.userId, table.type),
    index('transactions_external_order_idx').on(table.externalOrderId),
  ]
)

// ─── 充值/提现申请表 ─────────────────────────────────────────
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',   // 待支付 / 待审核
  'paid',      // 已支付（充值回调成功）
  'approved',  // 已审核通过（提现）
  'rejected',  // 审核拒绝
  'completed', // 完成打款
  'failed',    // 失败
  'expired',   // 超时
])

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // deposit = 充值, withdraw = 提现
    direction: varchar('direction', { length: 10 }).notNull(),

    amountCents: numeric('amount_cents', { precision: 15, scale: 0 }).notNull(),
    status: paymentStatusEnum('status').default('pending').notNull(),

    // 支付渠道：alipay | wechat | bank
    channel: varchar('channel', { length: 50 }),

    // 支付宝/微信返回的交易号
    externalTradeNo: varchar('external_trade_no', { length: 128 }),

    // 提现账户信息（JSON 字符串存储，如收款账号/银行卡）
    accountInfo: text('account_info'),

    // 管理员备注（提现审核用）
    adminRemark: text('admin_remark'),
    reviewedBy: integer('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    // 对应的流水记录
    transactionId: integer('transaction_id').references(() => transactions.id, {
      onDelete: 'set null',
    }),

    expiredAt: timestamp('expired_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('payments_user_id_idx').on(table.userId),
    index('payments_status_idx').on(table.status),
    index('payments_direction_idx').on(table.direction),
    index('payments_external_trade_no_idx').on(table.externalTradeNo),
    index('payments_created_at_idx').on(table.createdAt),
  ]
)

// ─── Relations ──────────────────────────────────────────────
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  wallet: one(wallets, { fields: [transactions.walletId], references: [wallets.id] }),
  bet: one(bets, { fields: [transactions.betId], references: [bets.id] }),
}))

export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
