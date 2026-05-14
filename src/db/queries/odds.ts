/**
 * 赔率相关数据库操作
 */
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../client'
import { odds, oddsHistory } from '../schema/odds'
import type { Odds, NewOdds } from '../schema/odds'

// ─── 查询 ─────────────────────────────────────────────────

/** 获取某场比赛的所有赔率（含投注类型信息） */
export async function getOddsByMatchId(matchId: number): Promise<Odds[]> {
  return db
    .select()
    .from(odds)
    .where(and(eq(odds.matchId, matchId), eq(odds.status, 'active')))
}

/** 根据 ID 获取单条赔率 */
export async function getOddsById(id: number): Promise<Odds | undefined> {
  const result = await db.select().from(odds).where(eq(odds.id, id)).limit(1)
  return result[0]
}

/** 批量获取赔率（用于投注确认时快照） */
export async function getOddsByIds(ids: number[]): Promise<Odds[]> {
  return db.select().from(odds).where(inArray(odds.id, ids))
}

// ─── 写入 ─────────────────────────────────────────────────

/** 批量创建比赛赔率 */
export async function createOdds(data: NewOdds[]): Promise<Odds[]> {
  return db.insert(odds).values(data).returning()
}

/**
 * 更新赔率值（自动记录变更历史）
 * @param id - 赔率 ID
 * @param newValue - 新赔率
 * @param changedBy - 操作管理员 ID（undefined = 系统自动）
 * @param reason - 变更原因
 */
export async function updateOddsValue(
  id: number,
  newValue: string,
  changedBy?: number,
  reason?: string
): Promise<Odds | undefined> {
  return db.transaction(async (tx) => {
    // 先查当前值
    const current = await tx
      .select({ value: odds.value })
      .from(odds)
      .where(eq(odds.id, id))
      .limit(1)

    if (!current[0]) return undefined

    const oldValue = current[0].value

    // 更新赔率
    const updated = await tx
      .update(odds)
      .set({ value: newValue, updatedAt: new Date() })
      .where(and(eq(odds.id, id), eq(odds.isLocked, false))) // 已锁定不允许更新
      .returning()

    if (!updated[0]) return undefined

    // 记录历史
    await tx.insert(oddsHistory).values({
      oddsId: id,
      oldValue,
      newValue,
      changedBy,
      reason,
    })

    return updated[0]
  })
}

/** 暂停/恢复某场比赛所有赔率 */
export async function suspendMatchOdds(matchId: number, suspend: boolean): Promise<number> {
  const result = await db
    .update(odds)
    .set({
      status: suspend ? 'suspended' : 'active',
      updatedAt: new Date(),
    })
    .where(and(eq(odds.matchId, matchId), eq(odds.isLocked, false)))
  return result.rowCount ?? 0
}

/** 锁定赔率（开赛后/结算前调用，防止结算期间赔率被修改） */
export async function lockMatchOdds(matchId: number): Promise<number> {
  const result = await db
    .update(odds)
    .set({ isLocked: true, status: 'closed', updatedAt: new Date() })
    .where(eq(odds.matchId, matchId))
  return result.rowCount ?? 0
}
