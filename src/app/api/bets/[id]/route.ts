import { NextResponse } from 'next/server'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { bets, matches, users, odds, betTypes } from '@/db/schema'
import { requireAuth } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'

// GET /api/bets/[id] — 投注详情
export const GET = withHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const auth = await requireAuth(req)
    const { id } = await params
    const betId = Number(id)

    if (isNaN(betId)) {
      return NextResponse.json({ error: '无效的投注 ID' }, { status: 400 })
    }

    const [row] = await db
      .select({
        id: bets.id,
        selection: bets.selection,
        oddsSnapshot: bets.oddsSnapshot,
        amountCents: bets.amountCents,
        potentialPayoutCents: bets.potentialPayoutCents,
        actualPayoutCents: bets.actualPayoutCents,
        status: bets.status,
        placedAt: bets.placedAt,
        settledAt: bets.settledAt,
        matchId: bets.matchId,
        teamHome: matches.teamHome,
        teamAway: matches.teamAway,
        scoreHome: matches.scoreHome,
        scoreAway: matches.scoreAway,
        matchStatus: matches.status,
        startedAt: matches.startedAt,
        betTypeId: odds.betTypeId,
        optionLabel: odds.optionLabel,
        userId: bets.userId,
        username: users.username,
      })
      .from(bets)
      .innerJoin(matches, eq(matches.id, bets.matchId))
      .leftJoin(odds, eq(odds.id, bets.oddsId))
      .leftJoin(users, eq(users.id, bets.userId))
      .where(eq(bets.id, betId))
      .limit(1)

    if (!row) {
      return NextResponse.json({ error: '投注不存在' }, { status: 404 })
    }

    if (auth.role !== 'admin' && row.userId !== Number(auth.sub)) {
      return NextResponse.json({ error: '无权查看此投注' }, { status: 403 })
    }

    return NextResponse.json({
      id: row.id,
      selection: row.selection,
      odds_snapshot: row.oddsSnapshot,
      amount_cents: row.amountCents,
      potential_payout_cents: row.potentialPayoutCents,
      actual_payout_cents: row.actualPayoutCents,
      status: row.status,
      placed_at: row.placedAt,
      settled_at: row.settledAt,
      match: {
        id: row.matchId,
        home_team: row.teamHome,
        away_team: row.teamAway,
        home_score: row.scoreHome,
        away_score: row.scoreAway,
        status: row.matchStatus,
        started_at: row.startedAt,
      },
      odds: {
        bet_type_id: row.betTypeId,
        option_label: row.optionLabel,
      },
      user: {
        id: row.userId,
        name: row.username,
      },
    })
  },
)
