/**
 * PATCH /api/odds/[id]/suspend  — 暂停/恢复单条赔率（仅管理员）
 *
 * 用于临时关闭某个投注选项（如主力球员受伤需临时停止该赔率投注）
 */
import { NextRequest } from 'next/server'
import { withHandler, parseBody, ok, notFound, badRequest, requireAdmin } from '@/lib/api'
import { suspendOddsSchema } from '@/lib/validations'
import { getOddsById } from '@/db/queries/odds'
import { db } from '@/db/client'
import { odds } from '@/db/schema/odds'
import { eq, and } from 'drizzle-orm'

type Context = { params: Promise<{ id: string }> }

export const PATCH = withHandler(async (req: NextRequest, context: Context) => {
  await requireAdmin(req)

  const { id } = await context.params
  const oddsId = parseInt(id, 10)
  if (isNaN(oddsId)) return notFound('无效的赔率 ID')

  const current = await getOddsById(oddsId)
  if (!current) return notFound('赔率不存在')
  if (current.isLocked) return badRequest('该赔率已锁定，无法操作')

  const body = await parseBody(req, suspendOddsSchema)

  await db
    .update(odds)
    .set({
      status: body.suspend ? 'suspended' : 'active',
      updatedAt: new Date(),
    })
    .where(and(eq(odds.id, oddsId), eq(odds.isLocked, false)))

  return ok(
    { id: oddsId, status: body.suspend ? 'suspended' : 'active' },
    body.suspend ? '赔率已暂停' : '赔率已恢复'
  )
})
