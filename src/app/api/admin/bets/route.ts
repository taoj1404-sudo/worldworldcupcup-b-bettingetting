/**
 * GET /api/admin/bets — 管理员投注查询（支持用户/状态/比赛筛选）
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, desc, sql, and } from 'drizzle-orm'
import { bets, users, matches, odds, betTypes } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok } from '@/lib/api'

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
  const offset = (page - 1) * pageSize
  const status = searchParams.get('status') ?? undefined
  const userId = searchParams.get('user_id') ?? undefined
  const matchId = searchParams.get('match_id') ?? undefined

  const conditions = []
  if (status) conditions.push(eq(bets.status, status as 'pending' | 'won' | 'lost' | 'cancelled'))
  if (userId) conditions.push(eq(bets.userId, parseInt(userId, 10)))
  if (matchId) conditions.push(eq(bets.matchId, parseInt(matchId, 10)))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: bets.id,
        username: users.username,
        email: users.email,
        teamHome: matches.teamHome,
        teamAway: matches.teamAway,
        scoreHome: matches.scoreHome,
        scoreAway: matches.scoreAway,
        matchStatus: matches.status,
        selection: bets.selection,
        oddsSnapshot: bets.oddsSnapshot,
        amountCents: bets.amountCents,
        potentialPayoutCents: bets.potentialPayoutCents,
        actualPayoutCents: bets.actualPayoutCents,
        status: bets.status,
        placedAt: bets.placedAt,
        settledAt: bets.settledAt,
        betTypeName: betTypes.name,
      })
      .from(bets)
      .innerJoin(users, eq(users.id, bets.userId))
      .innerJoin(matches, eq(matches.id, bets.matchId))
      .leftJoin(odds, eq(odds.id, bets.oddsId))
      .leftJoin(betTypes, eq(betTypes.id, odds.betTypeId))
      .where(whereClause)
      .orderBy(desc(bets.placedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(bets)
      .where(whereClause),
  ])

  // 汇总
  const [summary] = await db
    .select({
      totalAmount: sql<number>`coalesce(sum(cast(${bets.amountCents} as bigint)), 0)`,
      totalPayout: sql<number>`coalesce(sum(case when ${bets.actualPayoutCents} is not null then cast(${bets.actualPayoutCents} as bigint) else 0 end), 0)`,
    })
    .from(bets)
    .where(whereClause)

  return ok({
    bets: rows.map((r) => ({
      ...r,
      scoreHome: r.scoreHome ?? 0,
      scoreAway: r.scoreAway ?? 0,
      amountCents: Number(r.amountCents),
      oddsSnapshot: Number(r.oddsSnapshot),
      potentialPayoutCents: Number(r.potentialPayoutCents),
      actualPayoutCents: r.actualPayoutCents ? Number(r.actualPayoutCents) : null,
    })),
    summary: {
      totalAmountCents: Number(summary.totalAmount ?? 0),
      totalPayoutCents: Number(summary.totalPayout ?? 0),
    },
    pagination: {
      page,
      pageSize,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / pageSize),
    },
  })
})
