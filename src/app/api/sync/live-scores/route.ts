/**
 * POST /api/sync/live-scores — 同步进行中比赛的实时比分
 *
 * 设计为可被定时任务调用（如 cron 每30秒）
 * 也可被管理员手动触发
 */
import { NextRequest } from 'next/server'
import { withHandler, ok, requireAdmin } from '@/lib/api'
import { syncLiveScores } from '@/lib/sports/sync-service'

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const result = await syncLiveScores()
  return ok({
    ...result,
    syncedAt: new Date().toISOString(),
  })
})
