/**
 * GET  /api/admin/users/[id]  — 用户详情（含投注统计/流水）
 * PATCH /api/admin/users/[id]  — 修改用户状态（冻结/解冻/设为管理员）
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, desc, sql, and } from 'drizzle-orm'
import { users, bets, transactions } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok, notFound, badRequest } from '@/lib/api'
import { z } from 'zod'

type Context = { params: Promise<{ id: string }> }

// ─── GET /api/admin/users/[id] ─────────────────────────────────
export const GET = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)
  const { id } = await context.params
  const uid = parseInt(id, 10)
  if (isNaN(uid)) return badRequest('无效的用户 ID')

  // 用户基本信息
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      status: users.status,
      balanceCents: users.balanceCents,
      totalBets: users.totalBets,
      totalWonCents: users.totalWonCents,
      totalLostCents: users.totalLostCents,
      phone: users.phone,
      isPhoneVerified: users.isPhoneVerified,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)

  if (!user) return notFound('用户不存在')

  // 投注统计
  const [betStats] = await db
    .select({
      totalBetCount: sql<number>`count(*)`,
      totalBetAmount: sql<number>`coalesce(sum(cast(${bets.amountCents} as int)), 0)`,
      pendingBets: sql<number>`count(case when ${bets.status} = 'pending' then 1 end)`,
      wonBets: sql<number>`count(case when ${bets.status} = 'won' then 1 end)`,
      lostBets: sql<number>`count(case when ${bets.status} = 'lost' then 1 end)`,
    })
    .from(bets)
    .where(eq(bets.userId, uid))

  // 最近 20 条流水
  const recentTxns = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      status: transactions.status,
      amountCents: transactions.amountCents,
      balanceBeforeCents: transactions.balanceBeforeCents,
      balanceAfterCents: transactions.balanceAfterCents,
      remark: transactions.remark,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.userId, uid))
    .orderBy(desc(transactions.createdAt))
    .limit(20)

  return ok({
    user: {
      ...user,
      balanceCents: Number(user.balanceCents ?? 0),
      totalBets: Number(user.totalBets ?? 0),
      totalWonCents: Number(user.totalWonCents ?? 0),
      totalLostCents: Number(user.totalLostCents ?? 0),
    },
    betStats: {
      totalBetCount: Number(betStats.totalBetCount),
      totalBetAmount: Number(betStats.totalBetAmount),
      pendingBets: Number(betStats.pendingBets),
      wonBets: Number(betStats.wonBets),
      lostBets: Number(betStats.lostBets),
    },
    recentTransactions: recentTxns.map((t) => ({
      ...t,
      amountCents: Number(t.amountCents),
      balanceBeforeCents: Number(t.balanceBeforeCents),
      balanceAfterCents: Number(t.balanceAfterCents),
    })),
  })
})

// ─── PATCH /api/admin/users/[id] ──────────────────────────────
const UpdateUserSchema = z.object({
  status: z.enum(['active', 'frozen', 'pending']).optional(),
  role: z.enum(['user', 'admin']).optional(),
})

export const PATCH = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)
  const { id } = await context.params
  const uid = parseInt(id, 10)
  if (isNaN(uid)) return badRequest('无效的用户 ID')

  const parsed = UpdateUserSchema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.issues[0].message)
  if (!parsed.data.status && !parsed.data.role) return badRequest('至少需要提供 status 或 role')

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (parsed.data.status) updates.status = parsed.data.status
  if (parsed.data.role) updates.role = parsed.data.role

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, uid))
    .returning({ id: users.id, status: users.status, role: users.role })

  if (!updated) return notFound('用户不存在')

  return ok({ message: '用户信息已更新', user: updated })
})
