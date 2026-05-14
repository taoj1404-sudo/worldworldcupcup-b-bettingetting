import { db } from '@/db'
import { transactions, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateDepositInput } from '@/lib/validations/accounts'

// ── 申请充值（模拟：直接入账） ───────────────────────────────────────
export async function requestDeposit(userId: number, input: CreateDepositInput) {
  const amountCents = input.amount_cents

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'deposit'),
          eq(transactions.status, 'pending'),
        ),
      )
      .limit(1)

    if (existing) {
      return { success: false, message: '有处理中的充值申请' }
    }

    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for('update')

    if (!user) return { success: false, message: '用户不存在' }

    const before = Number(user.balanceCents)
    const after = before + amountCents

    const [txn] = await tx.insert(transactions).values({
      userId,
      type: 'deposit',
      amountCents: String(amountCents),
      balanceBeforeCents: String(before),
      balanceAfterCents: String(after),
      status: 'completed',
      remark: `充值 ${amountCents / 100} 元`,
    }).returning()

    await tx
      .update(users)
      .set({ balanceCents: String(after) })
      .where(eq(users.id, userId))

    return { success: true, transactionId: Number(txn.id) }
  })
}

// ── 获取账户统计 ───────────────────────────────────────────────────
export async function getAccountStats(userId: number) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))

  if (!user) return null

  const allTx = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const totalDeposited = allTx
    .filter((t: any) => t.type === 'deposit' && t.status === 'completed')
    .reduce((s: number, t: any) => s + Number(t.amountCents), 0)

  const totalWithdrawn = allTx
    .filter((t: any) => t.type === 'withdraw' && t.status === 'completed')
    .reduce((s: number, t: any) => s + Number(t.amountCents), 0)

  const won = allTx
    .filter((t: any) => t.type === 'bet_win')
    .reduce((s: number, t: any) => s + Number(t.amountCents), 0)

  const lost = allTx
    .filter((t: any) => t.type === 'bet_loss')
    .reduce((s: number, t: any) => s + Number(t.amountCents), 0)

  return {
    balanceCents: Number(user.balanceCents),
    totalDeposited,
    totalWithdrawn,
    totalWonCents: won,
    totalLostCents: lost,
  }
}
