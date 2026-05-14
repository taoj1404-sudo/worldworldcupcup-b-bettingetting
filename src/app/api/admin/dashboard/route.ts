/**
 * GET /api/admin/dashboard — 管理员仪表盘统计数据
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, sql, gte, and, desc } from 'drizzle-orm'
import { users, bets, transactions, matches } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok } from '@/lib/api'

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  // ── 基础统计 ──────────────────────────────────────────
  const [
    [{ totalUsers }],
    [{ activeUsers }],
    [{ totalBets }],
    [{ pendingBets }],
    [{ pendingWithdrawals }],
    [{ todayDeposits }],
    [{ todayWithdrawals }],
    [{ totalPlatformProfit }],
  ] = await Promise.all([
    // 总用户数
    db.select({ totalUsers: sql<number>`count(*)` }).from(users),
    // 活跃用户（有余额或近期有投注）
    db.select({ activeUsers: sql<number>`count(*)` }).from(users).where(eq(users.status, 'active')),
    // 总投注数
    db.select({ totalBets: sql<number>`count(*)` }).from(bets),
    // 待结算投注
    db.select({ pendingBets: sql<number>`count(*)` }).from(bets).where(eq(bets.status, 'pending')),
    // 待处理提现
    db.select({ pendingWithdrawals: sql<number>`count(*)` })
      .from(transactions)
      .where(and(eq(transactions.type, 'withdraw'), eq(transactions.status, 'pending'))),
    // 今日充值总额
    db
      .select({ todayDeposits: sql<number>`coalesce(sum(cast(${transactions.amountCents} as int)), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, sql`CURRENT_DATE`)
        )
      ),
    // 今日提现总额
    db
      .select({ todayWithdrawals: sql<number>`coalesce(sum(cast(${transactions.amountCents} as int)), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'withdraw'),
          eq(transactions.status, 'completed'),
          gte(transactions.createdAt, sql`CURRENT_DATE`)
        )
      ),
    // 平台盈利（用户总亏损 - 平台运营成本，这里简化为 total_lost - total_won）
    db.select({ totalPlatformProfit: sql<number>`coalesce(sum(cast(${users.totalLostCents} as int) - cast(${users.totalWonCents} as int)), 0)` }).from(users),
  ])

  // ── 近期投注记录（最近 10 条） ─────────────────────────
  const recentBets = await db
    .select({
      id: bets.id,
      username: users.username,
      amountCents: bets.amountCents,
      oddsSnapshot: bets.oddsSnapshot,
      potentialPayoutCents: bets.potentialPayoutCents,
      status: bets.status,
      placedAt: bets.placedAt,
    })
    .from(bets)
    .innerJoin(users, eq(users.id, bets.userId))
    .orderBy(desc(bets.placedAt))
    .limit(10)

  // ── 待结算比赛（已结束但还有未结算投注的） ──────────────
  const pendingSettleMatches = await db
    .select({
      id: matches.id,
      teamHome: matches.teamHome,
      teamAway: matches.teamAway,
      scoreHome: matches.scoreHome,
      scoreAway: matches.scoreAway,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
      pendingBetCount: sql<number>`(
        SELECT count(*)::int FROM bets
        WHERE bets.match_id = ${matches.id} AND bets.status = 'pending'
      )`,
    })
    .from(matches)
    .where(eq(matches.status, 'finished'))
    .orderBy(desc(matches.finishedAt))
    .limit(20)

  // ── 按状态分组比赛统计 ─────────────────────────────────
  const matchStats = await db
    .select({
      status: matches.status,
      count: sql<number>`count(*)`,
    })
    .from(matches)
    .groupBy(matches.status)

  return ok({
    stats: {
      totalUsers: Number(totalUsers ?? 0),
      activeUsers: Number(activeUsers ?? 0),
      totalBets: Number(totalBets ?? 0),
      pendingBets: Number(pendingBets ?? 0),
      pendingWithdrawals: Number(pendingWithdrawals ?? 0),
      todayDepositsCents: Number(todayDeposits ?? 0),
      todayWithdrawalsCents: Number(todayWithdrawals ?? 0),
      platformProfitCents: Number(totalPlatformProfit ?? 0),
    },
    recentBets,
    pendingSettleMatches: pendingSettleMatches.map((m) => ({
      ...m,
      scoreHome: m.scoreHome ?? 0,
      scoreAway: m.scoreAway ?? 0,
    })),
    matchStats: matchStats.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = Number(r.count)
      return acc
    }, {}),
  })
})
