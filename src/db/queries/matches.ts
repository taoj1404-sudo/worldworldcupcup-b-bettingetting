/**
 * 比赛相关数据库操作
 */
import { eq, and, gte, lte, desc, asc, inArray } from 'drizzle-orm'
import { db } from '../client'
import { matches, matchStatusEnum } from '../schema/matches'
import type { Match, NewMatch } from '../schema/matches'

type MatchStatus = (typeof matchStatusEnum.enumValues)[number]

// ─── 查询 ─────────────────────────────────────────────────

/** 获取所有比赛（支持状态过滤，按开赛时间排序） */
export async function getMatches(options?: {
  status?: MatchStatus | MatchStatus[]
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}): Promise<Match[]> {
  const conditions = []

  if (options?.status) {
    if (Array.isArray(options.status)) {
      conditions.push(inArray(matches.status, options.status))
    } else {
      conditions.push(eq(matches.status, options.status))
    }
  }
  if (options?.from) {
    conditions.push(gte(matches.scheduledAt, options.from))
  }
  if (options?.to) {
    conditions.push(lte(matches.scheduledAt, options.to))
  }

  return db
    .select()
    .from(matches)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(matches.scheduledAt))
    .limit(options?.limit ?? 100)
    .offset(options?.offset ?? 0)
}

/** 根据 ID 获取单场比赛 */
export async function getMatchById(id: number): Promise<Match | undefined> {
  const result = await db.select().from(matches).where(eq(matches.id, id)).limit(1)
  return result[0]
}

/** 获取进行中的比赛 */
export async function getLiveMatches(): Promise<Match[]> {
  return db
    .select()
    .from(matches)
    .where(eq(matches.status, 'live'))
    .orderBy(asc(matches.scheduledAt))
}

// ─── 写入 ─────────────────────────────────────────────────

/** 创建比赛 */
export async function createMatch(data: NewMatch): Promise<Match> {
  const result = await db.insert(matches).values(data).returning()
  return result[0]
}

/** 更新比分 */
export async function updateMatchScore(
  id: number,
  scoreHome: number,
  scoreAway: number,
  halfScoreHome?: number,
  halfScoreAway?: number
): Promise<Match | undefined> {
  const result = await db
    .update(matches)
    .set({
      scoreHome,
      scoreAway,
      ...(halfScoreHome !== undefined && { halfScoreHome }),
      ...(halfScoreAway !== undefined && { halfScoreAway }),
      updatedAt: new Date(),
    })
    .where(eq(matches.id, id))
    .returning()
  return result[0]
}

/** 更新比赛状态 */
export async function updateMatchStatus(
  id: number,
  status: MatchStatus,
  extra?: { startedAt?: Date; finishedAt?: Date; matchMinute?: number }
): Promise<Match | undefined> {
  const result = await db
    .update(matches)
    .set({
      status,
      ...extra,
      updatedAt: new Date(),
    })
    .where(eq(matches.id, id))
    .returning()
  return result[0]
}

/** 批量更新比赛状态（如批量关闭已结束比赛） */
export async function bulkUpdateMatchStatus(
  ids: number[],
  status: MatchStatus
): Promise<number> {
  const result = await db
    .update(matches)
    .set({ status, updatedAt: new Date() })
    .where(inArray(matches.id, ids))
  return result.rowCount ?? 0
}
