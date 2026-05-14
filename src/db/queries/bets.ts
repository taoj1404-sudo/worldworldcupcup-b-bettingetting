import { db } from '@/db'
import { eq, and, desc, sql } from 'drizzle-orm'
import { bets, odds, matches, users, transactions, betTypes } from '@/db/schema'
import type { CreateBetInput } from '@/lib/validations/bets'
import type { JwtPayload } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/auth'

// ── 结算判定引擎 ───────────────────────────────────────────────────────────
/**
 * 判断某一注是否中奖
 * @param selection  用户的选择（如 "home"/"draw"/"away"/"over"/"under"）
 * @param betCategory 投注玩法类型（result/handicap/over_under/...）
 * @param match      比赛数据
 * @param odd        赔率记录（含让球线/大小球线）
 */
function isBetWon(
  selection: string,
  betCategory: string | null | undefined,
  match: { scoreHome: number | null; scoreAway: number | null; halfScoreHome?: number | null; halfScoreAway?: number | null },
  odd: { option: string; handicap?: string | null; line?: string | null }
): boolean | null {
  const sh = match.scoreHome
  const sa = match.scoreAway
  if (sh == null || sa == null) return null  // 比赛未完成

  switch (betCategory) {
    // ── 胜平负 (1X2) ───────────────────────────────────────
    case 'result':
    case null:
    case undefined: {
      const result = sh > sa ? 'home' : sh < sa ? 'away' : 'draw'
      return selection === result
    }

    // ── 让球盘 (Asian Handicap) ────────────────────────────
    // handicap 存储在赔率记录上，如 "-0.5" 表示主队让半球
    case 'handicap': {
      const hcp = Number(odd.handicap ?? 0)
      // 主队净胜球 = (主队进球 + 让球值) - 客队进球
      // 让球值为正表示主队受让（弱队），为负表示主队让出（强队）
      const adjustedHome = sh + hcp
      if (selection === 'home') {
        if (adjustedHome > sa) return true    // 主队赢
        if (adjustedHome < sa) return false   // 主队输
        return null  // 平（退注）
      } else if (selection === 'away') {
        if (adjustedHome < sa) return true
        if (adjustedHome > sa) return false
        return null
      }
      return false
    }

    // ── 大小球 (Over/Under) ────────────────────────────────
    case 'over_under': {
      const line = Number(odd.line ?? 2.5)
      const total = sh + sa
      if (selection === 'over')  return total > line
      if (selection === 'under') return total < line
      if (total === line) return null  // 恰好等于基准线：退注
      return false
    }

    // ── 波胆 (Exact Score) ─────────────────────────────────
    // selection 格式："{scoreHome}:{scoreAway}" 如 "2:1"
    case 'exact_score': {
      return selection === `${sh}:${sa}`
    }

    // ── 半场/全场 (Half Full) ──────────────────────────────
    // selection 格式："{halfResult}/{fullResult}" 如 "home/home"、"draw/home"
    case 'half_full': {
      const hsh = match.halfScoreHome
      const hsa = match.halfScoreAway
      if (hsh == null || hsa == null) return null
      const halfResult = hsh > hsa ? 'home' : hsh < hsa ? 'away' : 'draw'
      const fullResult = sh  > sa  ? 'home' : sh  < sa  ? 'away' : 'draw'
      return selection === `${halfResult}/${fullResult}`
    }

    // ── 双方得分 (Both Teams To Score) ────────────────────
    // selection: "yes" 或 "no"
    case 'both_score': {
      const bothScored = sh > 0 && sa > 0
      if (selection === 'yes') return bothScored
      if (selection === 'no')  return !bothScored
      return false
    }

    default:
      // 未知玩法：回退到胜平负判定
      return selection === (sh > sa ? 'home' : sh < sa ? 'away' : 'draw')
  }
}

// ── 下注 ──────────────────────────────────────────────────────────────
export async function placeBet(input: CreateBetInput, auth: JwtPayload) {
  return db.transaction(async (tx) => {
    const uid = Number(auth.sub)

    // 1. 幂等检查
    const existing = await tx
      .select({ id: bets.id })
      .from(bets)
      .where(and(eq(bets.idempotencyKey, input.idempotency_key), eq(bets.userId, uid)))
      .limit(1)
    if (existing.length > 0) {
      const r = await tx.select().from(bets).where(eq(bets.id, existing[0].id)).limit(1)
      return { alreadyExists: true, bet: r[0] }
    }

    // 2. 查询赔率（锁定 + 检查可用性）
    const [odd] = await tx
      .select({ o: odds, m: matches })
      .from(odds)
      .innerJoin(matches, eq(matches.id, odds.matchId))
      .where(eq(odds.id, input.odds_id))
      .for('update')

    if (!odd) throw new ApiError('赔率不存在', 404)
    if (odd.m.status !== 'live' && odd.m.status !== 'scheduled') throw new ApiError('比赛不在投注中', 400)

    const oddValue = Number(odd.o.value)
    if (!oddValue || oddValue < 1.01) throw new ApiError('赔率无效', 400)

    // 3. 锁定用户行，扣款
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, uid))
      .for('update')

    if (!user) throw new ApiError('用户不存在', 404)
    if (user.status !== 'active') throw new ApiError('账户已被冻结', 403)

    const userBalance = Number(user.balanceCents)
    if (userBalance < input.amount_cents) {
      throw new ApiError(`余额不足（当前 ${userBalance} 分，需 ${input.amount_cents} 分）`, 400)
    }

    const newBalance = userBalance - input.amount_cents
    await tx
      .update(users)
      .set({ balanceCents: String(newBalance) })
      .where(eq(users.id, uid))

    // 4. 写入投注记录
    const potentialPayout = Math.floor(input.amount_cents * oddValue)
    const [bet] = await tx
      .insert(bets)
      .values({
        userId: uid,
        oddsId: input.odds_id,
        matchId: odd.m.id,
        selection: input.selection,
        oddsSnapshot: String(oddValue),
        amountCents: String(input.amount_cents),
        potentialPayoutCents: String(potentialPayout),
        status: 'pending',
        idempotencyKey: input.idempotency_key,
      })
      .returning()

    // 5. 记录账户流水
    await tx.insert(transactions).values({
      userId: uid,
      type: 'bet_place',
      amountCents: String(input.amount_cents),
      balanceBeforeCents: user.balanceCents,
      balanceAfterCents: String(newBalance),
      betId: bet.id,
      remark: `投注 #${bet.id}（赔率 ${oddValue}）`,
    })

    return { alreadyExists: false, bet, newBalance }
  })
}

// ── 列表查询 ──────────────────────────────────────────────────────────
export async function listBets(opts: {
  userId?: number
  status?: 'pending' | 'won' | 'lost' | 'cancelled'
  page?: number
  pageSize?: number
}) {
  const { userId, status, page = 1, pageSize = 20 } = opts
  const offset = (page - 1) * pageSize

  const conditions = [
    userId ? eq(bets.userId, userId) : undefined,
    status ? eq(bets.status, status) : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[]

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: bets.id,
        selection: bets.selection,
        oddsSnapshot: bets.oddsSnapshot,
        amountCents: bets.amountCents,
        potentialPayoutCents: bets.potentialPayoutCents,
        actualPayoutCents: bets.actualPayoutCents,
        status: bets.status,
        placedAt: bets.placedAt,
        matchId: bets.matchId,
        teamHome: matches.teamHome,
        teamAway: matches.teamAway,
        scoreHome: matches.scoreHome,
        scoreAway: matches.scoreAway,
        matchStatus: matches.status,
        betTypeName: betTypes.name,
      })
      .from(bets)
      .innerJoin(matches, eq(matches.id, bets.matchId))
      .leftJoin(odds, eq(odds.id, bets.oddsId))
      .leftJoin(betTypes, eq(betTypes.id, odds.betTypeId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(bets.placedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(bets)
      .where(conditions.length ? and(...conditions) : undefined),
  ])

  return { bets: rows, total, page, pageSize, totalPages: Math.ceil(Number(total) / pageSize) }
}

// ── 管理员单注结算 ─────────────────────────────────────────────────────
export async function settleSingleBet(
  betId: number,
  result: 'won' | 'lost' | 'cancelled',
) {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select({ b: bets, m: matches })
      .from(bets)
      .innerJoin(matches, eq(matches.id, bets.matchId))
      .where(eq(bets.id, betId))
      .for('update')

    if (!bet) throw new ApiError('投注不存在', 404)
    if (bet.b.status !== 'pending') throw new ApiError('该注已结算', 409)

    let actualPayoutCents = 0
    if (result === 'won') {
      actualPayoutCents = Number(bet.b.potentialPayoutCents)
    }

    if (actualPayoutCents > 0) {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, bet.b.userId))
        .for('update')
      const newBal = Number(user.balanceCents) + actualPayoutCents
      await tx
        .update(users)
        .set({ balanceCents: String(newBal) })
        .where(eq(users.id, bet.b.userId))
      await tx.insert(transactions).values({
        userId: bet.b.userId,
        type: 'bet_win',
        amountCents: String(actualPayoutCents),
        balanceBeforeCents: user.balanceCents,
        balanceAfterCents: String(newBal),
        betId: betId,
        remark: `投注 #${betId} 结算赢取`,
      })
    }

    await tx
      .update(bets)
      .set({ status: result, settledAt: new Date(), actualPayoutCents: String(actualPayoutCents) })
      .where(eq(bets.id, betId))

    return { betId, status: result, actualPayoutCents }
  })
}

// ── 管理员批量结算（按比赛，支持全玩法自动判定） ────────────────────────
export async function settleMatchBets(
  matchId: number,
  options?: {
    /** 手动传入每条赔率的最终结果（oddsId → selection string），覆盖自动判定 */
    resultsMap?: Record<number, string>
  }
) {
  return db.transaction(async (tx) => {
    const [match] = await tx
      .select()
      .from(matches)
      .where(eq(matches.id, matchId))
      .for('update')

    if (!match) throw new ApiError('比赛不存在', 404)
    if (match.status !== 'finished') throw new ApiError('比赛尚未结束', 400)

    // 拉取所有待结算的注单（连同赔率 + 投注类型）
    const pendingBets = await tx
      .select({
        b: bets,
        o: odds,
        btCategory: betTypes.category,
      })
      .from(bets)
      .innerJoin(odds, eq(odds.id, bets.oddsId))
      .leftJoin(betTypes, eq(betTypes.id, odds.betTypeId))
      .where(and(eq(bets.matchId, matchId), eq(bets.status, 'pending')))

    const settled: { betId: number; result: 'won' | 'lost' | 'cancelled'; actualWin: number }[] = []

    for (const { b: bet, o: odd, btCategory } of pendingBets) {
      const oddsId = Number(odd.id)

      // 手动结果映射优先
      let won: boolean | null
      if (options?.resultsMap?.[oddsId] !== undefined) {
        won = options.resultsMap[oddsId] === bet.selection
      } else {
        won = isBetWon(bet.selection, btCategory, match, odd)
      }

      // won === null 表示退注（让球平、大小球恰好等于基准线）
      const betResult: 'won' | 'lost' | 'cancelled' = won === null ? 'cancelled' : won ? 'won' : 'lost'
      // 退注全额返还投注金额；中奖返还赔付金额
      const actualWin = betResult === 'cancelled'
        ? Number(bet.amountCents)
        : betResult === 'won'
          ? Number(bet.potentialPayoutCents)
          : 0

      await tx
        .update(bets)
        .set({
          status: betResult,
          settledAt: new Date(),
          actualPayoutCents: String(actualWin),
        })
        .where(eq(bets.id, bet.id))

      if (actualWin > 0) {
        const [u] = await tx.select().from(users).where(eq(users.id, bet.userId)).for('update')
        const newBal = Number(u.balanceCents) + actualWin
        await tx.update(users).set({ balanceCents: String(newBal) }).where(eq(users.id, bet.userId))
        const remark = betResult === 'cancelled'
          ? `比赛 #${matchId} 退注返还（${btCategory ?? '玩法'}）`
          : `比赛 #${matchId} 结算赢取（${btCategory ?? '玩法'} ${match.scoreHome}:${match.scoreAway}）`
        await tx.insert(transactions).values({
          userId: bet.userId,
          type: betResult === 'cancelled' ? 'bet_refund' : 'bet_win',
          amountCents: String(actualWin),
          balanceBeforeCents: u.balanceCents,
          balanceAfterCents: String(newBal),
          betId: bet.id,
          remark,
        })
      }

      settled.push({ betId: bet.id, result: betResult, actualWin })
    }

    // 更新比赛已结算计数
    await tx
      .update(matches)
      .set({ settledBets: sql`${matches.settledBets} + ${settled.length}` })
      .where(eq(matches.id, matchId))

    return settled
  })
}
