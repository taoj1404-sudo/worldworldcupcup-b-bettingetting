/**
 * PATCH /api/matches/[id]/score  — 更新比赛比分（仅管理员）
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
import { updateScoreSchema } from '@/lib/validations'
import { getMatchById, updateMatchScore } from '@/db/queries/matches'
import { emitMatchScoreUpdate } from '@/lib/socket/server'

type Context = { params: Promise<{ id: string }> }

export const PATCH = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)

  const { id } = await context.params
  const matchId = parseInt(id, 10)
  if (isNaN(matchId)) return notFound('无效的比赛 ID')

  const match = await getMatchById(matchId)
  if (!match) return notFound('比赛不存在')

  if (match.status !== 'live') {
    return badRequest(`当前比赛状态为「${match.status}」，只有进行中的比赛才能更新比分`)
  }

  const body = await parseBody(req, updateScoreSchema)

  const updated = await updateMatchScore(
    matchId,
    body.scoreHome,
    body.scoreAway,
    body.halfScoreHome,
    body.halfScoreAway
  )

  // WebSocket 广播比分更新
  emitMatchScoreUpdate({
    matchId,
    homeScore: body.scoreHome,
    awayScore: body.scoreAway,
    updatedAt: new Date().toISOString(),
  })

  return ok(updated, '比分更新成功')
})
