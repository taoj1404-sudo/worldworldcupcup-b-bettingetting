import { NextResponse } from 'next/server'
import { db } from '@/db'
import { eq, and, gte, sql } from 'drizzle-orm'
import { users, bets } from '@/db/schema'
import { requireAuth } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'

// GET /api/account — 当前用户账户信息
export const GET = withHandler(async (req) => {
  const auth = await requireAuth(req)
  const uid = Number(auth.sub)

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      balanceCents: users.balanceCents,
      totalBets: users.totalBets,
      totalWonCents: users.totalWonCents,
      totalLostCents: users.totalLostCents,
      createdAt: users.createdAt,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, uid))
    .limit(1)

  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  }

  // 近30天投注统计
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [stats] = await db
    .select({
      totalBet: sql<number>`coalesce(sum(cast(${bets.amountCents} as int)), 0)`,
      totalWon: sql<number>`coalesce(sum(case when ${bets.status} = 'won' then cast(${bets.actualPayoutCents} as int) else 0 end), 0)`,
      totalLost: sql<number>`coalesce(sum(case when ${bets.status} = 'lost' then cast(${bets.amountCents} as int) else 0 end), 0)`,
      pendingBets: sql<number>`count(case when ${bets.status} = 'pending' then 1 end)`,
    })
    .from(bets)
    .where(and(eq(bets.userId, uid), gte(bets.placedAt, thirtyDaysAgo)))

  return NextResponse.json({
    id: user.id,
    username: user.username,
    balance_cents: user.balanceCents,
    status: user.status,
    created_at: user.createdAt,
    summary: {
      total_bet_cents: user.totalBets,
      total_won_cents: user.totalWonCents,
      total_lost_cents: user.totalLostCents,
    },
    last_30_days: {
      total_bet_cents: Number(stats.totalBet),
      total_won_cents: Number(stats.totalWon),
      total_lost_cents: Number(stats.totalLost),
      pending_bets: Number(stats.pendingBets),
    },
  })
})
