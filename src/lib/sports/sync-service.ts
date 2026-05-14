/**
 * 比赛数据同步服务
 *
 * 负责：
 * 1. 从 API-Football 拉取5大联赛赛程
 * 2. 写入/更新本地数据库
 * 3. 自动计算并写入赔率
 * 4. 实时同步进行中比赛比分
 */
import { db } from '@/db'
import { eq, and, inArray } from 'drizzle-orm'
import { matches } from '@/db/schema/matches'
import { odds } from '@/db/schema/odds'
import { oddsHistory } from '@/db/schema/odds'
import { betTypes } from '@/db/schema/betTypes'
import {
  fetchUpcomingFixtures,
  fetchLiveFixtures,
  fetchOddsByFixture,
  mapFixtureStatus,
  toTeamCode,
  LEAGUE_CONFIG,
  SUPPORTED_LEAGUE_IDS,
  type ApiFootballFixture,
} from './api-football'
import { resolveOdds } from './odds-engine'

// Re-export for convenience (route imports from here)
export { LEAGUE_CONFIG, SUPPORTED_LEAGUE_IDS } from './api-football'

// ─── 联赛ID → matchStage 映射 ────────────────────────────
function leagueRoundToStage(round: string): string {
  if (round.includes('Final') && round.includes('Semi')) return 'semi_final'
  if (round.includes('Quarter')) return 'quarter_final'
  if (round.includes('Final')) return 'final'
  return 'group_a' // 联赛常规轮次都用 group_a（后续可扩展）
}

// ─── 判断是否5大联赛 ───────────────────────────────────────
export function isSupportedLeague(leagueId: number): boolean {
  return SUPPORTED_LEAGUE_IDS.includes(leagueId)
}

// ─── 同步结果统计 ─────────────────────────────────────────
export interface SyncResult {
  leagueId: number
  leagueName: string
  created: number
  updated: number
  oddsCreated: number
  oddsUpdated: number
  errors: string[]
}

// ─── 核心：同步单个联赛的比赛数据 ─────────────────────────
export async function syncLeagueFixtures(leagueId: number): Promise<SyncResult> {
  const leagueInfo = LEAGUE_CONFIG[leagueId]
  const result: SyncResult = {
    leagueId,
    leagueName: leagueInfo?.name ?? String(leagueId),
    created: 0,
    updated: 0,
    oddsCreated: 0,
    oddsUpdated: 0,
    errors: [],
  }

  try {
    // 1. 获取第三方API比赛数据
    const fixtures = await fetchUpcomingFixtures(leagueId)
    if (!fixtures.length) {
      // 若API未配置，用模拟数据演示
      console.log(`[Sync] ${leagueInfo?.name} 无API数据，跳过`)
      return result
    }

    // 2. 查询bet_types
    const allBetTypes = await db.select().from(betTypes).limit(10)
    const btResult    = allBetTypes.find(bt => bt.code === 'result_1x2')
    const btHandicap  = allBetTypes.find(bt => bt.code === 'handicap')
    const btOU        = allBetTypes.find(bt => bt.code === 'over_under')

    // 3. 逐场处理
    for (const fixture of fixtures) {
      try {
        await upsertFixture(fixture, result, { btResult, btHandicap, btOU })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        result.errors.push(`Fixture ${fixture.fixture.id}: ${msg}`)
        console.error(`[Sync] 处理比赛失败:`, err)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    result.errors.push(msg)
    console.error(`[Sync] 联赛同步失败 ${leagueId}:`, err)
  }

  return result
}

// ─── 写入或更新单场比赛 ────────────────────────────────────
async function upsertFixture(
  fixture: ApiFootballFixture,
  result: SyncResult,
  betTypeRefs: { btResult?: typeof betTypes.$inferSelect; btHandicap?: typeof betTypes.$inferSelect; btOU?: typeof betTypes.$inferSelect }
) {
  const { fixture: f, teams, goals, score, league } = fixture

  // 检查比赛是否已存在（通过 notes 字段存储 externalId）
  const externalId = `api-football-${f.id}`
  const existing = await db
    .select({ id: matches.id, status: matches.status, scoreHome: matches.scoreHome, scoreAway: matches.scoreAway })
    .from(matches)
    .where(eq(matches.notes, externalId))
    .limit(1)

  const scheduledAt = new Date(f.date)
  const bettingClosesAt = new Date(scheduledAt.getTime() - 60 * 60 * 1000) // 开赛前1小时截止

  const status = mapFixtureStatus(f.status.short)
  const stage = leagueRoundToStage(league.round)

  const matchData = {
    teamHome:     teams.home.name,
    teamAway:     teams.away.name,
    teamHomeCode: toTeamCode(teams.home.name),
    teamAwayCode: toTeamCode(teams.away.name),
    teamHomeFlagUrl: teams.home.logo,
    teamAwayFlagUrl: teams.away.logo,
    scoreHome:    goals.home ?? undefined,
    scoreAway:    goals.away ?? undefined,
    halfScoreHome: score.halftime.home ?? undefined,
    halfScoreAway: score.halftime.away ?? undefined,
    status,
    stage:        stage as typeof matches.$inferInsert['stage'],
    matchMinute:  f.status.elapsed ?? undefined,
    venue:        f.venue.name ?? undefined,
    city:         f.venue.city ?? undefined,
    country:      LEAGUE_CONFIG[league.id]?.country ?? undefined,
    scheduledAt,
    bettingClosesAt,
    notes: externalId,
    updatedAt: new Date(),
  }

  let matchId: number

  if (existing.length === 0) {
    // 新建比赛
    const [created] = await db
      .insert(matches)
      .values({ ...matchData, createdAt: new Date() } as typeof matches.$inferInsert)
      .returning({ id: matches.id })
    matchId = created.id
    result.created++

    // 为新比赛生成赔率
    await createMatchOdds(matchId, teams.home.name, teams.away.name, f.id, result, betTypeRefs)
  } else {
    matchId = existing[0].id
    const prev = existing[0]

    // 只更新需要变动的字段
    await db
      .update(matches)
      .set(matchData)
      .where(eq(matches.id, matchId))

    result.updated++

    // 比赛进行中：实时更新赔率
    if (status === 'live' && prev.status !== 'finished') {
      await updateLiveOdds(matchId, teams.home.name, teams.away.name, f.id, result)
    }
  }
}

// ─── 为新比赛创建赔率 ──────────────────────────────────────
async function createMatchOdds(
  matchId: number,
  homeTeam: string,
  awayTeam: string,
  fixtureId: number,
  result: SyncResult,
  betTypeRefs: { btResult?: typeof betTypes.$inferSelect; btHandicap?: typeof betTypes.$inferSelect; btOU?: typeof betTypes.$inferSelect }
) {
  // 尝试获取API赔率
  const apiOdds = await fetchOddsByFixture(fixtureId)
  const calculated = resolveOdds(homeTeam, awayTeam, apiOdds)

  const oddsToInsert: typeof odds.$inferInsert[] = []

  // 胜平负
  if (betTypeRefs.btResult) {
    const btId = betTypeRefs.btResult.id
    oddsToInsert.push(
      { matchId, betTypeId: btId, option: 'home', optionLabel: '主胜', value: String(calculated.result.home) },
      { matchId, betTypeId: btId, option: 'draw', optionLabel: '平局', value: String(calculated.result.draw) },
      { matchId, betTypeId: btId, option: 'away', optionLabel: '客胜', value: String(calculated.result.away) },
    )
  }

  // 让球
  if (betTypeRefs.btHandicap) {
    const btId = betTypeRefs.btHandicap.id
    const { line, home: hOdds, away: aOdds } = calculated.handicap
    const lineStr = line >= 0 ? `+${line}` : String(line)
    oddsToInsert.push(
      { matchId, betTypeId: btId, option: 'home', optionLabel: `主队 (${lineStr})`, value: String(hOdds), handicap: String(line) },
      { matchId, betTypeId: btId, option: 'away', optionLabel: `客队 (${line >= 0 ? String(-line) : String(Math.abs(line))})`, value: String(aOdds), handicap: String(-line) },
    )
  }

  // 大小球
  if (betTypeRefs.btOU) {
    const btId = betTypeRefs.btOU.id
    const { line, over, under } = calculated.overUnder
    oddsToInsert.push(
      { matchId, betTypeId: btId, option: 'over',  optionLabel: `大球 ${line}`, value: String(over),  line: String(line) },
      { matchId, betTypeId: btId, option: 'under', optionLabel: `小球 ${line}`, value: String(under), line: String(line) },
    )
  }

  if (oddsToInsert.length > 0) {
    await db.insert(odds).values(oddsToInsert)
    result.oddsCreated += oddsToInsert.length
  }
}

// ─── 实时更新赔率（比赛进行中） ────────────────────────────
async function updateLiveOdds(
  matchId: number,
  homeTeam: string,
  awayTeam: string,
  fixtureId: number,
  result: SyncResult
) {
  const apiOdds = await fetchOddsByFixture(fixtureId)
  if (!apiOdds) return

  const calculated = resolveOdds(homeTeam, awayTeam, apiOdds)
  const existingOdds = await db
    .select()
    .from(odds)
    .where(and(eq(odds.matchId, matchId), eq(odds.isLocked, false)))

  for (const odd of existingOdds) {
    let newValue: number | undefined

    if (odd.option === 'home'  && !odd.handicap && !odd.line) newValue = calculated.result.home
    if (odd.option === 'draw'  && !odd.handicap && !odd.line) newValue = calculated.result.draw
    if (odd.option === 'away'  && !odd.handicap && !odd.line) newValue = calculated.result.away
    if (odd.option === 'over'  && odd.line)  newValue = calculated.overUnder.over
    if (odd.option === 'under' && odd.line)  newValue = calculated.overUnder.under

    if (newValue === undefined) continue

    const oldValue = Number(odd.value)
    if (Math.abs(newValue - oldValue) < 0.01) continue // 变动小于0.01不更新

    await db.update(odds)
      .set({ value: String(newValue), updatedAt: new Date() })
      .where(eq(odds.id, odd.id))

    await db.insert(oddsHistory).values({
      oddsId: odd.id,
      oldValue: String(oldValue),
      newValue: String(newValue),
      changedBy: undefined,
      reason: '系统实时同步',
    })

    result.oddsUpdated++
  }
}

// ─── 同步所有支持联赛 ─────────────────────────────────────
export async function syncAllLeagues(): Promise<SyncResult[]> {
  const results: SyncResult[] = []
  for (const leagueId of SUPPORTED_LEAGUE_IDS) {
    const r = await syncLeagueFixtures(leagueId)
    results.push(r)
  }
  return results
}

// ─── 同步所有正在进行的比赛比分 ───────────────────────────
export async function syncLiveScores(): Promise<{ updated: number }> {
  let updated = 0
  for (const leagueId of SUPPORTED_LEAGUE_IDS) {
    const liveFixtures = await fetchLiveFixtures(leagueId)
    for (const fixture of liveFixtures) {
      const externalId = `api-football-${fixture.fixture.id}`
      const existing = await db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.notes, externalId))
        .limit(1)

      if (!existing.length) continue

      const matchId = existing[0].id
      await db.update(matches).set({
        scoreHome:    fixture.goals.home ?? undefined,
        scoreAway:    fixture.goals.away ?? undefined,
        halfScoreHome: fixture.score.halftime.home ?? undefined,
        halfScoreAway: fixture.score.halftime.away ?? undefined,
        matchMinute:  fixture.fixture.status.elapsed ?? undefined,
        status:       mapFixtureStatus(fixture.fixture.status.short),
        updatedAt:    new Date(),
      }).where(eq(matches.id, matchId))

      updated++
    }
  }
  return { updated }
}
