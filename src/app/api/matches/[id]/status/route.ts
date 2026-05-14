/**
 * PATCH /api/matches/[id]/status  — 更新比赛状态（仅管理员）
 */
import { NextRequest } from 'next/server'
import {
  withHandler,
  parseBody,
  ok,
  notFound,
  badRequest,
  requireAdmin,
} from '@/lib/api'
import { updateMatchStatusSchema } from '@/lib/validations'
import { getMatchById, updateMatchStatus } from '@/db/queries/matches'
import { lockMatchOdds, suspendMatchOdds } from '@/db/queries/odds'
import { emitMatchStatusChange, emitOddsSuspended } from '@/lib/socket/server'

type Context = { params: Promise<{ id: string }> }

// 允许的状态流转
const VALID_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['live', 'cancelled', 'postponed'],
  postponed: ['scheduled', 'cancelled'],
  live: ['finished', 'cancelled'],
  finished: [],
  cancelled: [],
}

export const PATCH = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)

  const { id } = await context.params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) return notFound('无效的比赛 ID')

  const match = await getMatchById(matchId)
  if (!match) return notFound('比赛不存在')

  const body = await parseBody(req, updateMatchStatusSchema)
  const { status: newStatus } = body

  const allowedTransitions = VALID_TRANSITIONS[match.status] ?? []
  if (!allowedTransitions.includes(newStatus)) {
    return badRequest(
      `不允许从「${match.status}」变更为「${newStatus}」。` +
        `当前允许变更为：${allowedTransitions.join(', ') || '无'}`
    )
  }

  const now = new Date()
  const extra: Record<string, Date | number | undefined> = {}

  if (newStatus === 'live') {
    extra.startedAt = now
    await lockMatchOdds(matchId)
  } else if (newStatus === 'finished') {
    extra.finishedAt = now
    // TODO: 触发结算任务
  } else if (newStatus === 'cancelled') {
    await suspendMatchOdds(matchId, true)
  }

  const updated = await updateMatchStatus(matchId, newStatus as any, extra as any)

  // WebSocket 广播状态变更
  emitMatchStatusChange({
    matchId,
    status: newStatus as any,
    updatedAt: new Date().toISOString(),
  })

  return ok(updated, `比赛状态已更新为「${newStatus}」`)
})
