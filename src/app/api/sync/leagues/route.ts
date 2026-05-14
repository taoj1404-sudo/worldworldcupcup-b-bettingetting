/**
 * POST /api/sync/leagues — 同步5大联赛赛程 + 赔率
 * GET  /api/sync/leagues — 查询各联赛同步状态
 *
 * 仅管理员可调用
 */
import { NextRequest } from 'next/server'
import { withHandler, ok, requireAdmin } from '@/lib/api'
import { syncAllLeagues, syncLeagueFixtures, LEAGUE_CONFIG, SUPPORTED_LEAGUE_IDS } from '@/lib/sports/sync-service'

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const body = await req.json().catch(() => ({}))
  const leagueId = body?.leagueId ? Number(body.leagueId) : undefined

  if (leagueId) {
    // 同步单个联赛
    if (!SUPPORTED_LEAGUE_IDS.includes(leagueId)) {
      return new Response(
        JSON.stringify({ success: false, error: `不支持的联赛ID: ${leagueId}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const result = await syncLeagueFixtures(leagueId)
    return ok({ results: [result], syncedAt: new Date().toISOString() })
  }

  // 同步全部联赛
  const results = await syncAllLeagues()
  const totalCreated = results.reduce((s, r) => s + r.created, 0)
  const totalUpdated = results.reduce((s, r) => s + r.updated, 0)
  const totalOdds    = results.reduce((s, r) => s + r.oddsCreated, 0)
  const errors       = results.flatMap(r => r.errors)

  return ok({
    results,
    summary: { totalCreated, totalUpdated, totalOdds, errorCount: errors.length },
    syncedAt: new Date().toISOString(),
  })
})

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  return ok({
    supportedLeagues: SUPPORTED_LEAGUE_IDS.map(id => ({
      id,
      ...LEAGUE_CONFIG[id],
    })),
    apiConfigured: !!process.env.API_FOOTBALL_KEY,
  })
})
