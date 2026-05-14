/**
 * GET    /api/odds/[id]  — 查询单条赔率
 * PATCH  /api/odds/[id]  — 更新赔率值（仅管理员）
 */
import { NextRequest } from 'next/server'
import {
  withHandler,
  parseBody,
  ok,
  notFound,
  badRequest,
  requireAdmin,
  getAuthUser,
} from '@/lib/api'
import { updateOddsSchema } from '@/lib/validations'
import { getOddsById, updateOddsValue } from '@/db/queries/odds'

type Context = { params: Promise<{ id: string }> }

// ─── GET /api/odds/[id] ───────────────────────────────────
export const GET = withHandler(async (_req: NextRequest, context: Context) => {
  const { id } = await context.params
  const oddsId = parseInt(id, 10)
  if (isNaN(oddsId)) return notFound('无效的赔率 ID')

  const oddsItem = await getOddsById(oddsId)
  if (!oddsItem) return notFound('赔率不存在')

  return ok(oddsItem)
})

// ─── PATCH /api/odds/[id] ─────────────────────────────────
export const PATCH = withHandler(async (req: NextRequest, context: Context) => {
  const admin = await requireAdmin(req)

  const { id } = await context.params
  const oddsId = parseInt(id, 10)
  if (isNaN(oddsId)) return notFound('无效的赔率 ID')

  // 检查赔率是否存在及是否已锁定
  const current = await getOddsById(oddsId)
  if (!current) return notFound('赔率不存在')
  if (current.isLocked) return badRequest('该赔率已锁定，无法修改（比赛已开始）')
  if (current.status === 'closed') return badRequest('该赔率已关闭，无法修改')

  const body = await parseBody(req, updateOddsSchema)

  const updated = await updateOddsValue(
    oddsId,
    body.value,
    parseInt(admin.sub, 10),
    body.reason
  )

  if (!updated) return badRequest('赔率更新失败（可能已被锁定）')

  // TODO: 广播 WebSocket 事件 odds:update
  // broadcastOddsUpdate(current.matchId, updated)

  return ok(updated, '赔率更新成功')
})
