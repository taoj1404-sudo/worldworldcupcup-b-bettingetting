import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { users, transactions } from '@/db/schema'
import { requireAuth } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'
import { CreateWithdrawalSchema } from '@/lib/validations/accounts'

// POST /api/account/withdraw — 申请提现
export const POST = withHandler(async (req) => {
  const auth = await requireAuth(req)
  const uid = Number(auth.sub)

  const parsed = CreateWithdrawalSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { amount_cents, bank_card, real_name } = parsed.data.body

  return db
    .transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, uid))
        .for('update')

      if (!user) throw new Error('用户不存在')
      if (user.status !== 'active') throw new Error('账户状态异常')
      if (Number(user.balanceCents) < amount_cents) {
        throw new Error(`余额不足（可用 ${user.balanceCents} 分）`)
      }

      const [withdrawal] = await tx
        .insert(transactions)
        .values({
          userId: uid,
          type: 'withdraw',
          amountCents: String(amount_cents),
          balanceBeforeCents: user.balanceCents,
          balanceAfterCents: user.balanceCents, // 待审核，不扣款
          remark: `提现申请（${real_name} / ${bank_card}）`,
        })
        .returning()

      return {
        message: '提现申请已提交，等待管理员审核',
        withdrawal_id: withdrawal.id,
        amount_cents,
        status: 'pending_review',
      }
    })
    .then((r) => NextResponse.json(r, { status: 201 }))
    .catch((err) => {
      const msg = err?.message ?? '提现申请失败'
      return NextResponse.json({ error: msg }, { status: 400 })
    })
})
