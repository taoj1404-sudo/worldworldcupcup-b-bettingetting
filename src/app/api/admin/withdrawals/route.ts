import { NextResponse } from 'next/server'
import { db } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { transactions, users } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler } from '@/lib/api/handler'

// GET /api/admin/withdrawals — 管理员查询所有提现申请
export const GET = withHandler(async (req) => {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('page_size')) || 20
  const offset = (page - 1) * pageSize

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.type, 'withdraw'))
    .orderBy(desc(transactions.createdAt))
    .limit(pageSize)
    .offset(offset)

  return NextResponse.json({ withdrawals: rows })
})

// PATCH /api/admin/withdrawals/[id]?action=approve|reject — 审核提现
export const PATCH = withHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin(req)
    const { id } = await params
    const txId = Number(id)

    if (isNaN(txId)) {
      return NextResponse.json({ error: '无效的记录 ID' }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '缺少 action 参数（approve | reject）' }, { status: 400 })
    }

    return db
      .transaction(async (tx) => {
        const [txn] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, txId))
          .for('update')

        if (!txn) throw new Error('记录不存在')
        if (txn.type !== 'withdraw') throw new Error('不是提现记录')
        if (txn.status !== 'pending') throw new Error('该申请已处理')

        if (action === 'approve') {
          const [user] = await tx.select().from(users).where(eq(users.id, txn.userId)).for('update')
          if (!user) throw new Error('用户不存在')
          const amount = Number(txn.amountCents)
          if (Number(user.balanceCents) < amount) throw new Error('用户余额不足')

          const newBal = Number(user.balanceCents) - amount
          await tx.update(users).set({ balanceCents: String(newBal) }).where(eq(users.id, txn.userId))
          await tx
            .update(transactions)
            .set({ balanceAfterCents: String(newBal), status: 'completed', remark: `${txn.remark ?? ''} [已批准]` })
            .where(eq(transactions.id, txId))

          return { message: '提现已批准', id: txId, status: 'approved' }
        } else {
          await tx
            .update(transactions)
            .set({ status: 'failed', remark: `${txn.remark ?? ''} [已拒绝]` })
            .where(eq(transactions.id, txId))
          return { message: '提现已拒绝', id: txId, status: 'rejected' }
        }
      })
      .then((r) => NextResponse.json(r))
      .catch((err) => {
        const msg = err?.message ?? '操作失败'
        return NextResponse.json({ error: msg }, { status: 400 })
      })
  },
)
