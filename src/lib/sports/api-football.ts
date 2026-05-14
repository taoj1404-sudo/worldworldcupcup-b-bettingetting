/**
 * API-Football 数据服务
 * 文档：https://www.api-football.com/documentation-v3
 *
 * 支持联赛：
 *   英超 (PL)  = 39
 *   西甲 (PD)  = 140
 *   德甲 (BL1) = 78
 *   法甲 (FL1) = 61
 *   意甲 (SA)  = 135
 */

// ─── 联赛配置 ────────────────────────────────────────────────
export const LEAGUE_CONFIG: Record<number, { name: string; nameEn: string; country: string; season: number }> = {
  39:  { name: '英超', nameEn: 'Premier League',  country: 'England', season: 2025 },
  140: { name: '西甲', nameEn: 'La Liga',          country: 'Spain',   season: 2025 },
  78:  { name: '德甲', nameEn: 'Bundesliga',       country: 'Germany', season: 2025 },
  61:  { name: '法甲', nameEn: 'Ligue 1',          country: 'France',  season: 2025 },
  135: { name: '意甲', nameEn: 'Serie A',          country: 'Italy',   season: 2025 },
}

export const SUPPORTED_LEAGUE_IDS = Object.keys(LEAGUE_CONFIG).map(Number)

// ─── 类型定义 ────────────────────────────────────────────────
export interface ApiFootballFixture {
  fixture: {
    id: number
    date: string
    status: {
      short: 'NS' | 'TBD' | '1H' | 'HT' | '2H' | 'ET' | 'BT' | 'P' | 'FT' | 'AET' | 'PEN' | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE'
      elapsed: number | null
    }
    venue: {
      name: string | null
      city: string | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

export interface ApiFootballOdds {
  fixture: { id: number }
  bookmakers: Array<{
    id: number
    name: string
    bets: Array<{
      id: number
      name: string
      values: Array<{ value: string; odd: string }>
    }>
  }>
}

// ─── API 客户端 ─────────────────────────────────────────────
const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3'

async function fetchApi<T>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) {
    console.warn('[API-Football] API_FOOTBALL_KEY 未配置，跳过请求')
    return null
  }

  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': process.env.API_FOOTBALL_HOST || 'api-football-v1.p.rapidapi.com',
      },
      next: { revalidate: 0 }, // 关闭 Next.js 缓存
    })

    if (!res.ok) {
      console.error(`[API-Football] HTTP ${res.status}: ${path}`)
      return null
    }

    const json = await res.json()
    if (json.errors && Object.keys(json.errors).length > 0) {
      console.error('[API-Football] API错误:', json.errors)
      return null
    }

    return json.response as T
  } catch (err) {
    console.error('[API-Football] 请求异常:', err)
    return null
  }
}

// ─── 获取今日+明日比赛 ───────────────────────────────────────
export async function fetchUpcomingFixtures(leagueId: number): Promise<ApiFootballFixture[]> {
  const season = LEAGUE_CONFIG[leagueId]?.season ?? 2025
  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', {
    league: leagueId,
    season,
    next: 10, // 接下来10场
  })
  return data ?? []
}

// ─── 获取进行中比赛 ───────────────────────────────────────────
export async function fetchLiveFixtures(leagueId: number): Promise<ApiFootballFixture[]> {
  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', {
    league: leagueId,
    live: 'all',
  })
  return data ?? []
}

// ─── 按 fixture ID 获取比赛详情 ─────────────────────────────
export async function fetchFixtureById(fixtureId: number): Promise<ApiFootballFixture | null> {
  const data = await fetchApi<ApiFootballFixture[]>('/fixtures', { id: fixtureId })
  return data?.[0] ?? null
}

// ─── 获取赔率（来自 API-Football 内置赔率） ──────────────────
export async function fetchOddsByFixture(fixtureId: number): Promise<ApiFootballOdds | null> {
  const apiKey = process.env.API_FOOTBALL_KEY
  if (!apiKey) return null

  const data = await fetchApi<ApiFootballOdds[]>('/odds', {
    fixture: fixtureId,
    bookmaker: 8, // Bet365
  })
  return data?.[0] ?? null
}

// ─── API-Football 状态 → 本地状态映射 ─────────────────────
export function mapFixtureStatus(
  status: ApiFootballFixture['fixture']['status']['short']
): 'scheduled' | 'live' | 'finished' | 'cancelled' | 'postponed' {
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE']
  const finishedStatuses = ['FT', 'AET', 'PEN']
  const cancelledStatuses = ['CANC', 'ABD', 'AWD', 'WO']
  const postponedStatuses = ['PST']

  if (liveStatuses.includes(status)) return 'live'
  if (finishedStatuses.includes(status)) return 'finished'
  if (cancelledStatuses.includes(status)) return 'cancelled'
  if (postponedStatuses.includes(status)) return 'postponed'
  return 'scheduled'
}

// ─── 提取球队代码（取前3个字母）────────────────────────────
export function toTeamCode(name: string): string {
  // 处理常见球队名
  const codeMap: Record<string, string> = {
    'Manchester City':    'MCI',
    'Manchester United':  'MUN',
    'Real Madrid':        'RMA',
    'Barcelona':          'BAR',
    'Bayern Munich':      'BAY',
    'Paris Saint Germain':'PSG',
    'Juventus':           'JUV',
    'Inter':              'INT',
    'AC Milan':           'MIL',
    'Liverpool':          'LIV',
    'Chelsea':            'CHE',
    'Arsenal':            'ARS',
    'Tottenham':          'TOT',
    'Atletico Madrid':    'ATL',
    'Borussia Dortmund':  'BVB',
    'RB Leipzig':         'RBL',
    'Bayer Leverkusen':   'LEV',
    'Napoli':             'NAP',
    'Roma':               'ROM',
    'Lyon':               'LYO',
    'Monaco':             'MON',
    'Marseille':          'MAR',
    'Sevilla':            'SEV',
    'Valencia':           'VAL',
  }
  if (codeMap[name]) return codeMap[name]
  return name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'UNK'
}
