/**
 * GET /api/admin/payments — 充值/提现流水查询
 * 支持按 direction(deposit/withdraw)、status、日期范围筛选
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm'
import { transactions, users } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok } from '@/lib/api'

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
  const offset = (page - 1) * pageSize
  const direction = searchParams.get('direction') ?? undefined
  const status = searchParams.get('status') ?? undefined
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const conditions = []
  if (direction) conditions.push(eq(transactions.type, direction as 'deposit' | 'withdraw'))
  if (status) conditions.push(eq(transactions.status, status as 'pending' | 'completed' | 'failed' | 'cancelled'))
  if (from) conditions.push(gte(transactions.createdAt, new Date(from)))
  if (to) conditions.push(lte(transactions.createdAt, new Date(to + 'T23:59:59Z')))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        username: users.username,
        email: users.email,
        type: transactions.type,
        status: transactions.status,
        amountCents: transactions.amountCents,
        balanceBeforeCents: transactions.balanceBeforeCents,
        balanceAfterCents: transactions.balanceAfterCents,
        remark: transactions.remark,
        externalOrderId: transactions.externalOrderId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .leftJoin(users, eq(users.id, transactions.userId))
      .where(whereClause)
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(transactions)
      .where(whereClause),
  ])

  // 统计汇总
  const [summary] = await db
    .select({
      totalDeposit: sql<number>`coalesce(sum(case when ${transactions.type} = 'deposit' and ${transactions.status} = 'completed' then cast(${transactions.amountCents} as int) else 0 end), 0)`,
      totalWithdraw: sql<number>`coalesce(sum(case when ${transactions.type} = 'withdraw' and ${transactions.status} = 'completed' then cast(${transactions.amountCents} as int) else 0 end), 0)`,
      pendingWithdraw: sql<number>`coalesce(sum(case when ${transactions.type} = 'withdraw' and ${transactions.status} = 'pending' then cast(${transactions.amountCents} as int) else 0 end), 0)`,
    })
    .from(transactions)
    .where(whereClause)

  return ok({
    payments: rows.map((r) => ({
      ...r,
      amountCents: Number(r.amountCents),
      balanceBeforeCents: Number(r.balanceBeforeCents),
      balanceAfterCents: Number(r.balanceAfterCents),
    })),
    summary: {
      totalDepositCents: Number(summary.totalDeposit ?? 0),
      totalWithdrawCents: Number(summary.totalWithdraw ?? 0),
      pendingWithdrawCents: Number(summary.pendingWithdraw ?? 0),
    },
    pagination: {
      page,
      pageSize,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / pageSize),
    },
  })
})
