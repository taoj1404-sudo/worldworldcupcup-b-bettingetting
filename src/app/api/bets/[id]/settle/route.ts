/**
 * PATCH /api/bets/[id]/settle — 管理员单注结算（支持手动赔付金额）
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { users, transactions, bets } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok, badRequest, err } from '@/lib/api'
import { SettleSingleBetSchema } from '@/lib/validations/bets'

type Context = { params: Promise<{ id: string }> }

export const PATCH = withHandler(
  async (req: NextRequest, context: Context) => {
    await requireAdmin(req)
    const { id } = await context.params
    const betId = Number(id)

    if (isNaN(betId)) {
      return badRequest('无效的投注 ID')
    }

    const body = await req.json().catch(() => null)
    if (!body) return badRequest('请求体无效')

    const parsed = SettleSingleBetSchema.safeParse({ body })
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message)
    }

    const { result, actualPayoutCents } = parsed.data.body

    try {
      const settleResult = await db.transaction(async (tx) => {
        const [bet] = await tx
          .select()
          .from(bets)
          .where(eq(bets.id, betId))
          .for('update')

        if (!bet) throw new Error('投注不存在')
        if (bet.status !== 'pending') throw new Error('该注已结算')

        let actualPayout = 0
        if (result === 'won') {
          actualPayout = actualPayoutCents ?? Number(bet.potentialPayoutCents)
          const [user] = await tx.select().from(users).where(eq(users.id, bet.userId)).for('update')
          if (!user) throw new Error('用户不存在')
          const newBal = Number(user.balanceCents) + actualPayout
          await tx.update(users).set({ balanceCents: String(newBal) }).where(eq(users.id, bet.userId))
          await tx.insert(transactions).values({
            userId: bet.userId,
            type: 'bet_win',
            amountCents: String(actualPayout),
            balanceBeforeCents: user.balanceCents,
            balanceAfterCents: String(newBal),
            betId,
            remark: `管理员手动结算（${result}）`,
          })
        }

        await tx
          .update(bets)
          .set({
            status: result,
            settledAt: new Date(),
            actualPayoutCents: String(actualPayout),
          })
          .where(eq(bets.id, betId))

        return { betId, status: result, actualPayoutCents: actualPayout }
      })

      return ok({
        bet_id: settleResult.betId,
        status: settleResult.status,
        actual_payout_cents: settleResult.actualPayoutCents,
      }, '结算成功')
    } catch (err: any) {
      const msg = err?.message ?? '结算失败'
      const status = msg.includes('不存在') || msg.includes('已结算') ? 400 : 500
      return err(msg, undefined, status)
    }
  }
)
