import {
  pgTable,
  serial,
  integer,
  numeric,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';
import { users } from './users';

/**
 * 钱包表
 * 每个用户对应一个钱包，存储余额、冻结金额、币种
 */
export const wallets = pgTable(
  'wallets',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),

    // 余额 & 冻结金额（单位：分，避免浮点误差）
    balanceCents: numeric('balance_cents', { precision: 15, scale: 0 })
      .notNull()
      .default('0'),
    frozenCents: numeric('frozen_cents', { precision: 15, scale: 0 })
      .notNull()
      .default('0'),

    currency: varchar('currency', { length: 3 }).notNull().default('CNY'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`NOW()`)
      .notNull(),
  },
  (table) => [
    index('wallets_user_id_idx').on(table.userId),
  ]
);

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
