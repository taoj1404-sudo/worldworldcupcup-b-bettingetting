/**
 * GET  /api/odds?matchId=  — 查询某场比赛的赔率
 * POST /api/odds           — 批量创建赔率（仅管理员）
 */
import { NextRequest } from 'next/server'
import {
  withHandler,
  parseBody,
  ok,
  created,
  badRequest,
  notFound,
  requireAdmin,
} from '@/lib/api'
import { createOddsSchema } from '@/lib/validations'
import { getOddsByMatchId, createOdds } from '@/db/queries/odds'
import { getMatchById } from '@/db/queries/matches'

// ─── GET /api/odds?matchId=xxx ────────────────────────────
export const GET = withHandler(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams
  const matchIdStr = sp.get('matchId')

  if (!matchIdStr) return badRequest('缺少必要参数 matchId')

  const matchId = parseInt(matchIdStr, 10)
  if (isNaN(matchId)) return badRequest('matchId 格式不正确')

  const match = await getMatchById(matchId)
  if (!match) return notFound('比赛不存在')

  const oddsList = await getOddsByMatchId(matchId)

  // 按投注类型 ID 分组
  const grouped = oddsList.reduce<Record<number, typeof oddsList>>((acc, o) => {
    if (!acc[o.betTypeId]) acc[o.betTypeId] = []
    acc[o.betTypeId].push(o)
    return acc
  }, {})

  return ok({ matchId, match, oddsByType: grouped, total: oddsList.length })
})

// ─── POST /api/odds ───────────────────────────────────────
export const POST = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const body = await parseBody(req, createOddsSchema)

  // 验证比赛是否存在
  const match = await getMatchById(body.matchId)
  if (!match) return notFound('比赛不存在')

  // 只有 scheduled 状态可以设置赔率
  if (match.status === 'finished' || match.status === 'cancelled') {
    return badRequest('已结束或已取消的比赛不能设置赔率')
  }

  const newOdds = await createOdds(
    body.items.map((item) => ({
      matchId: body.matchId,
      ...item,
    }))
  )

  return created(
    { count: newOdds.length, odds: newOdds },
    `成功创建 ${newOdds.length} 条赔率`
  )
})
