/**
 * POST /api/bets/settle — 管理员按比赛批量结算
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'
import { SettleBetsSchema } from '@/lib/validations/bets'
import { settleMatchBets } from '@/db/queries/bets'
import { cacheInvalidate } from '@/lib/redis/client'
import { notifyLeaderboardUpdate, notifyBetSettlement, notifySystem } from '@/lib/sse/emitter'
import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'

// POST /api/bets/settle — 管理员按比赛批量结算
export const POST = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const parsed = SettleBetsSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    // resultsMap 用于手动覆盖自动判定（如特殊比分规则）
    const settled = await settleMatchBets(parsed.data.match_id, {
      resultsMap: parsed.data.resultsMap,
    })

    // 结算后清除排行榜缓存（余额已变动）
    await cacheInvalidate('lb:*', { prefix: 'lb' })

    // ── SSE 实时通知 ──────────────────────────────────────────────
    // 查询比赛信息用于通知
    const [match] = await db
      .select({ homeTeam: matches.teamHome, awayTeam: matches.teamAway })
      .from(matches)
      .where(eq(matches.id, parsed.data.match_id))
      .limit(1)

    const matchName = match
      ? `${match.homeTeam} vs ${match.awayTeam}`
      : `比赛 #${parsed.data.match_id}`

    // 统计中奖和退款数量（settleMatchBets 返回 { betId, result, actualWin }）
    const won = settled.filter((s: any) => s.result === 'won').length
    const voidBets = settled.filter((s: any) => s.result === 'cancelled').length

    // 广播结算通知
    notifyBetSettlement({
      matchId: parsed.data.match_id,
      matchName,
      status: 'won',
      settledCount: settled.length,
    })

    // 广播排行榜更新（余额已变化）
    notifyLeaderboardUpdate({
      leaderboard: [], // 客户端收到后应重新拉取 /api/leaderboard
      totalParticipants: 0,
    })

    // 发送系统通知
    if (settled.length > 0) {
      notifySystem(
        '比赛结算完成',
        `${matchName} 结算完成：${settled.length} 笔投注${won > 0 ? `，${won} 笔中奖` : ''}${voidBets > 0 ? `，${voidBets} 笔退款` : ''}`,
        'success'
      )
    }

    return NextResponse.json({
      message: '结算完成',
      match_id: parsed.data.match_id,
      settled_count: settled.length,
      details: settled,
    })
  } catch (err: any) {
    const msg = err?.message ?? '结算失败'
    const status = msg.includes('不存在') ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
})
