/**
 * GET /api/matches/[id]  — 查询单场比赛详情（含赔率）
 * PUT /api/matches/[id]  — 管理员更新比赛比分和状态
 */
import { NextRequest } from 'next/server'
import { withHandler, ok, notFound, err } from '@/lib/api'
import { getMatchById } from '@/db/queries/matches'
import { getOddsByMatchId } from '@/db/queries/odds'
import { db } from '@/db'
import { matches } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api/auth'
import { notifyMatchStatusChange, notifySystem } from '@/lib/sse/emitter'

type Context = { params: Promise<{ id: string }> }

export const GET = withHandler(async (_req: NextRequest, context: Context) => {
  const { id } = await context.params
  const matchId = parseInt(id, 10)

  if (isNaN(matchId)) return notFound('无效的比赛 ID')

  const [match, oddsList] = await Promise.all([
    getMatchById(matchId),
    getOddsByMatchId(matchId),
  ])

  if (!match) return notFound('比赛不存在')

  // 将赔率按投注类型分组
  const oddsGrouped = oddsList.reduce<Record<number, typeof oddsList>>(
    (acc, o) => {
      const key = o.betTypeId
      if (!acc[key]) acc[key] = []
      acc[key].push(o)
      return acc
    },
    {}
  )

  return ok({ match, odds: oddsGrouped })
})

export const PUT = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)
  const { id } = await context.params
  const matchId = parseInt(id, 10)

  if (isNaN(matchId)) return notFound('无效的比赛 ID')

  const body = await req.json().catch(() => null)
  if (!body) return err('请求体无效', undefined, 400)

  const { homeScore, awayScore, status } = body

  const updateData: Partial<typeof matches.$inferInsert> = {}
  if (homeScore !== undefined) updateData.scoreHome = homeScore
  if (awayScore !== undefined) updateData.scoreAway = awayScore
  if (status !== undefined) updateData.status = status
  updateData.updatedAt = new Date()

  const [updated] = await db
    .update(matches)
    .set(updateData)
    .where(eq(matches.id, matchId))
    .returning()

  if (!updated) return notFound('比赛不存在')

  // ── SSE 实时通知 ──────────────────────────────────────────────
  if (status !== undefined) {
    notifyMatchStatusChange({
      matchId: updated.id,
      status: updated.status as any,
      homeTeam: updated.teamHome,
      awayTeam: updated.teamAway,
      homeScore: updated.scoreHome ?? undefined,
      awayScore: updated.scoreAway ?? undefined,
    })

    const statusText: Record<string, string> = {
      upcoming: '未开始',
      live: '进行中',
      finished: '已结束',
      cancelled: '已取消',
      postponed: '已延期',
    }
    notifySystem(
      '比赛状态更新',
      `${updated.teamHome} vs ${updated.teamAway} → ${statusText[status] || status}`,
      status === 'live' ? 'info' : 'success'
    )
  }

  return ok({ match: updated }, '比赛已更新')
})
