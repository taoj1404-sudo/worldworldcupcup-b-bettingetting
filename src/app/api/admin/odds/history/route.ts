/**
 * GET /api/admin/odds/history — 赔率变更历史查询
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, desc, sql } from 'drizzle-orm'
import { oddsHistory, odds, matches, users } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok } from '@/lib/api'

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
  const offset = (page - 1) * pageSize
  const matchId = searchParams.get('match_id')
  const oddsId = searchParams.get('odds_id')

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: oddsHistory.id,
        oldValue: oddsHistory.oldValue,
        newValue: oddsHistory.newValue,
        reason: oddsHistory.reason,
        changedAt: oddsHistory.changedAt,
        oddsId: oddsHistory.oddsId,
        matchId: odds.matchId,
        teamHome: matches.teamHome,
        teamAway: matches.teamAway,
        option: odds.option,
        optionLabel: odds.optionLabel,
        changedByUsername: users.username,
      })
      .from(oddsHistory)
      .innerJoin(odds, eq(odds.id, oddsHistory.oddsId))
      .innerJoin(matches, eq(matches.id, odds.matchId))
      .leftJoin(users, eq(users.id, oddsHistory.changedBy))
      .where(matchId ? eq(matches.id, parseInt(matchId, 10)) : oddsId ? eq(odds.id, parseInt(oddsId, 10)) : undefined)
      .orderBy(desc(oddsHistory.changedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(oddsHistory)
      .innerJoin(odds, eq(odds.id, oddsHistory.oddsId)),
  ])

  return ok({
    history: rows.map((r) => ({
      ...r,
      oldValue: Number(r.oldValue),
      newValue: Number(r.newValue),
    })),
    pagination: { page, pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / pageSize) },
  })
})
