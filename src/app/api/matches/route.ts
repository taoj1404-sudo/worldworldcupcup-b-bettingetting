/**
 * GET  /api/matches  — 查询比赛列表
 * POST /api/matches  — 创建比赛（仅管理员）
 */
import { NextRequest } from 'next/server'
import { withHandler, parseBody, ok, created, badRequest, requireAdmin } from '@/lib/api'
import { createMatchSchema, listMatchesQuerySchema } from '@/lib/validations'
import { getMatches, createMatch } from '@/db/queries/matches'

// ─── GET /api/matches ─────────────────────────────────────
export const GET = withHandler(async (req: NextRequest) => {
  const sp = new URL(req.url).searchParams

  // 解析并验证查询参数
  const query = listMatchesQuerySchema.parse({
    status: sp.get('status') ?? undefined,
    stage: sp.get('stage') ?? undefined,
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    page: sp.get('page') ?? 1,
    pageSize: sp.get('pageSize') ?? 20,
  })

  const { page, pageSize, status, stage, from, to } = query
  const limit = pageSize
  const offset = (page - 1) * pageSize

  const matchList = await getMatches({
    status: status as any,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit,
    offset,
  })

  // 按状态分组，方便前端直接使用
  const grouped = {
    live: matchList.filter((m) => m.status === 'live'),
    scheduled: matchList.filter((m) => m.status === 'scheduled'),
    finished: matchList.filter((m) => m.status === 'finished'),
  }

  return ok({
    matches: matchList,
    grouped,
    pagination: {
      page,
      pageSize,
      total: matchList.length, // 后续可加 COUNT(*) 查询
    },
  })
})

// ─── POST /api/matches ────────────────────────────────────
export const POST = withHandler(async (req: NextRequest) => {
  // 仅管理员
  await requireAdmin(req)

  const body = await parseBody(req, createMatchSchema)

  // 计算默认投注截止时间（开赛前 1 小时）
  const scheduledAt = new Date(body.scheduledAt)
  const bettingClosesAt = body.bettingClosesAt
    ? new Date(body.bettingClosesAt)
    : new Date(scheduledAt.getTime() - 60 * 60 * 1000)

  if (bettingClosesAt >= scheduledAt) {
    return badRequest('投注截止时间必须早于开赛时间')
  }

  const match = await createMatch({
    ...body,
    scheduledAt,
    bettingClosesAt,
  })

  return created(match, '比赛创建成功')
})
