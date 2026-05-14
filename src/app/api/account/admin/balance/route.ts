import { NextResponse } from 'next/server'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { users, transactions } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'
import { AdjustBalanceSchema } from '@/lib/validations/accounts'

// PATCH /api/account/admin/balance — 管理员手动调整用户余额
export const PATCH = withHandler(async (req) => {
  await requireAdmin(req)

  const parsed = AdjustBalanceSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { user_id, amount_cents, reason } = parsed.data.body

  return db
    .transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, user_id))
        .for('update')

      if (!user) throw new Error('用户不存在')

      const newBalance = Number(user.balanceCents) + amount_cents
      if (newBalance < 0) throw new Error('调整后余额不能为负')

      await tx
        .update(users)
        .set({ balanceCents: String(newBalance) })
        .where(eq(users.id, user_id))

      const txType = amount_cents > 0 ? 'admin_credit' : 'admin_debit'
      await tx.insert(transactions).values({
        userId: user_id,
        type: txType,
        amountCents: String(Math.abs(amount_cents)),
        balanceBeforeCents: user.balanceCents,
        balanceAfterCents: String(newBalance),
        remark: `[管理员] ${reason}`,
      })

      return {
        message: '余额调整成功',
        user_id,
        before_cents: user.balanceCents,
        adjustment_cents: amount_cents,
        after_cents: String(newBalance),
      }
    })
    .then((r) => NextResponse.json(r))
    .catch((err) => {
      const msg = err?.message ?? '调整失败'
      return NextResponse.json({ error: msg }, { status: 400 })
    })
})
