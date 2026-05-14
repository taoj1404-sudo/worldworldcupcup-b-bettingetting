/**
 * 赔率计算引擎
 *
 * 支持两种模式：
 * 1. 从 API 拉取真实赔率（The Odds API / API-Football 内置赔率）
 * 2. 基于 ELO 评分自动计算赔率（无 API Key 时降级使用）
 *
 * 赔率格式：欧赔（European odds / Decimal odds）
 * 水位（庄家利润率）：默认 6%
 */

import type { ApiFootballOdds } from './api-football'

// ─── 常量 ────────────────────────────────────────────────────
const HOUSE_MARGIN = 0.06  // 庄家水位 6%

// ─── 类型定义 ────────────────────────────────────────────────
export interface MatchOdds {
  /** 胜平负赔率 */
  result: {
    home: number  // 主胜
    draw: number  // 平
    away: number  // 客胜
  }
  /** 亚盘让球（主队让球值，如 -0.5 表示主让半球） */
  handicap: {
    line: number       // 让球线，如 -0.5
    home: number       // 主胜赔率（吃让球后）
    away: number       // 客胜赔率（受让球后）
  }
  /** 大小球 */
  overUnder: {
    line: number       // 总进球基准线，如 2.5
    over: number       // 大球赔率
    under: number      // 小球赔率
  }
}

// ─── 从 API-Football 赔率响应中提取欧赔 ──────────────────────
export function parseApiFootballOdds(apiOdds: ApiFootballOdds): Partial<MatchOdds> {
  const bookmaker = apiOdds.bookmakers[0]
  if (!bookmaker) return {}

  const result: Partial<MatchOdds> = {}

  for (const bet of bookmaker.bets) {
    // bet.id === 1: Match Winner (1X2)
    if (bet.id === 1) {
      const homeOdd  = bet.values.find(v => v.value === 'Home')
      const drawOdd  = bet.values.find(v => v.value === 'Draw')
      const awayOdd  = bet.values.find(v => v.value === 'Away')
      if (homeOdd && drawOdd && awayOdd) {
        result.result = {
          home: parseFloat(homeOdd.odd),
          draw: parseFloat(drawOdd.odd),
          away: parseFloat(awayOdd.odd),
        }
      }
    }

    // bet.id === 12: Asian Handicap
    if (bet.id === 12 && bet.values.length >= 2) {
      const homeVal = bet.values[0]
      const awayVal = bet.values[1]
      // 解析让球值，如 "Home -0.5" -> -0.5
      const lineMatch = homeVal.value.match(/-?\d+\.?\d*/)
      const line = lineMatch ? parseFloat(lineMatch[0]) : -0.5
      result.handicap = {
        line,
        home: parseFloat(homeVal.odd),
        away: parseFloat(awayVal.odd),
      }
    }

    // bet.id === 5: Goals Over/Under
    if (bet.id === 5) {
      const over25  = bet.values.find(v => v.value === 'Over 2.5')
      const under25 = bet.values.find(v => v.value === 'Under 2.5')
      if (over25 && under25) {
        result.overUnder = {
          line: 2.5,
          over: parseFloat(over25.odd),
          under: parseFloat(under25.odd),
        }
      }
    }
  }

  return result
}

// ─── ELO 评分系统（用于自动计算赔率） ─────────────────────────
// 各大联赛球队默认 ELO 基准值（2025赛季近似值）
const DEFAULT_ELO: Record<string, number> = {
  // 英超
  'Manchester City':    1950,
  'Arsenal':            1880,
  'Liverpool':          1900,
  'Chelsea':            1820,
  'Manchester United':  1800,
  'Tottenham':          1780,
  'Newcastle':          1760,
  'Aston Villa':        1750,
  // 西甲
  'Real Madrid':        1980,
  'Barcelona':          1920,
  'Atletico Madrid':    1860,
  'Real Sociedad':      1760,
  'Sevilla':            1740,
  'Valencia':           1720,
  'Villarreal':         1730,
  'Athletic Club':      1750,
  // 德甲
  'Bayern Munich':      1960,
  'Borussia Dortmund':  1860,
  'RB Leipzig':         1840,
  'Bayer Leverkusen':   1870,
  'Eintracht Frankfurt':1760,
  'Wolfsburg':          1720,
  // 法甲
  'Paris Saint Germain':1900,
  'Monaco':             1800,
  'Lyon':               1780,
  'Marseille':          1770,
  'Lille':              1760,
  'Nice':               1740,
  // 意甲
  'Inter':              1900,
  'AC Milan':           1860,
  'Juventus':           1840,
  'Napoli':             1820,
  'Roma':               1800,
  'Lazio':              1780,
  'Atalanta':           1810,
  'Fiorentina':         1760,
}

const DEFAULT_ELO_VALUE = 1700  // 未知球队默认值

/**
 * 计算 ELO 胜率
 * P(home wins) = 1 / (1 + 10^((eloAway - eloHome) / 400))
 */
function eloWinProb(eloHome: number, eloAway: number): number {
  return 1 / (1 + Math.pow(10, (eloAway - eloHome) / 400))
}

/**
 * 根据 ELO 自动计算欧赔（含庄家水位）
 *
 * @param homeTeam  主队名称
 * @param awayTeam  客队名称
 * @param homeAdvantage  主场优势ELO加成，默认 +50
 */
export function calculateOddsFromElo(
  homeTeam: string,
  awayTeam: string,
  homeAdvantage = 50
): MatchOdds {
  const eloHome = (DEFAULT_ELO[homeTeam] ?? DEFAULT_ELO_VALUE) + homeAdvantage
  const eloAway = DEFAULT_ELO[awayTeam] ?? DEFAULT_ELO_VALUE

  // 胜率概率
  const pHome = eloWinProb(eloHome, eloAway)
  const pAway = eloWinProb(eloAway, eloHome)

  // 平局概率（经验公式：平局概率在两队实力相近时最高）
  const strengthDiff = Math.abs(eloHome - eloAway)
  const pDrawBase = Math.max(0.18, 0.35 - strengthDiff / 1000)
  const scale = 1 - pDrawBase
  const pHomeAdj = pHome * scale
  const pAwayAdj = pAway * scale
  const pDrawAdj = pDrawBase

  // 加入庄家水位后转换为欧赔
  const totalProb = 1 + HOUSE_MARGIN
  const oddsHome = parseFloat((totalProb / pHomeAdj).toFixed(2))
  const oddsDraw = parseFloat((totalProb / pDrawAdj).toFixed(2))
  const oddsAway = parseFloat((totalProb / pAwayAdj).toFixed(2))

  // 让球盘（根据实力差自动设定让球值）
  const eloDiff = eloHome - eloAway
  let handicapLine = 0
  if (eloDiff > 200) handicapLine = -1.5       // 主强客弱：主让1.5球
  else if (eloDiff > 100) handicapLine = -1.0   // 主强：主让1球
  else if (eloDiff > 40)  handicapLine = -0.5   // 主略强：主让半球
  else if (eloDiff < -200) handicapLine = 1.5   // 客强：主受让1.5球
  else if (eloDiff < -100) handicapLine = 1.0   // 客强：主受让1球
  else if (eloDiff < -40)  handicapLine = 0.5   // 客略强：主受让半球

  // 让球后赔率趋近均衡
  const handicapHome = parseFloat((1.90 + Math.random() * 0.04).toFixed(2))
  const handicapAway = parseFloat((1.90 + Math.random() * 0.04).toFixed(2))

  // 大小球（根据两队进攻力估算期望进球数）
  // 进攻力 ≈ ELO / 1700，期望进球数 ≈ 进攻力之和 * 1.2
  const attackStrength = ((eloHome + eloAway) / 2) / DEFAULT_ELO_VALUE
  const expectedGoals = attackStrength * 2.5
  const ouLine = expectedGoals >= 3.0 ? 3.5 : expectedGoals >= 2.5 ? 2.5 : 2.5

  // 大小球概率（泊松分布近似）
  const pOver = 1 - Math.exp(-expectedGoals) * (
    1 + expectedGoals + expectedGoals ** 2 / 2 + expectedGoals ** 3 / 6 +
    expectedGoals ** 4 / 24 + expectedGoals ** 5 / 120
  )
  const pUnder = 1 - pOver
  const ouHome = parseFloat((totalProb / Math.max(pOver, 0.1)).toFixed(2))
  const ouAway = parseFloat((totalProb / Math.max(pUnder, 0.1)).toFixed(2))

  return {
    result: { home: oddsHome, draw: oddsDraw, away: oddsAway },
    handicap: { line: handicapLine, home: handicapHome, away: handicapAway },
    overUnder: { line: ouLine, over: ouHome, under: ouAway },
  }
}

/**
 * 根据优先级合并赔率：
 * 优先使用 API 实时赔率，若无则降级到 ELO 计算
 */
export function resolveOdds(
  homeTeam: string,
  awayTeam: string,
  apiOdds?: ApiFootballOdds | null
): MatchOdds {
  const calculated = calculateOddsFromElo(homeTeam, awayTeam)

  if (!apiOdds) return calculated

  const parsed = parseApiFootballOdds(apiOdds)

  return {
    result:     parsed.result     ?? calculated.result,
    handicap:   parsed.handicap   ?? calculated.handicap,
    overUnder:  parsed.overUnder  ?? calculated.overUnder,
  }
}
