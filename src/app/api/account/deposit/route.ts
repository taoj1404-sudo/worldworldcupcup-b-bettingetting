/**
 * POST /api/account/deposit  — 申请充值
 */
import { NextRequest } from 'next/server'
import { withHandler, ok, badRequest, unauthorized } from '@/lib/api'
import { CreateDepositSchema } from '@/lib/validations/accounts'
import { requestDeposit, getAccountStats } from '@/db/queries/accounts'
import { requireAuth } from '@/lib/api/auth'
import { emitDepositSuccess } from '@/lib/socket/server'
import { notifyLeaderboardUpdate, notifySystem } from '@/lib/sse/emitter'

export const POST = withHandler(async (req: NextRequest) => {
  const auth = await requireAuth(req)
  const userId = parseInt(auth.sub, 10)

  const body = await req.json().catch(() => null)
  if (!body) return badRequest('请求体无效')

  const parsed = CreateDepositSchema.safeParse({ body })
  if (!parsed.success) return badRequest(parsed.error.issues[0].message)

  const result = await requestDeposit(userId, parsed.data.body)

  if (!result.success) return badRequest(result.message || '充值申请失败')

  // 模拟支付完成：立即到账，广播实时通知
  const updated = await getAccountStats(userId)
  if (updated) {
    // SSE 广播：充值成功 + 排行榜更新（余额已变）
    notifySystem(
      '充值成功',
      `已到账 ¥${(parsed.data.body.amount_cents / 100).toFixed(2)}，当前余额 ¥${(Number(updated.balanceCents) / 100).toFixed(2)}`,
      'success'
    )
    notifyLeaderboardUpdate({ leaderboard: [], totalParticipants: 0 })
  }

  return ok({
    transactionId: result.transactionId,
    amountCents: parsed.data.body.amount_cents,
    newBalance: updated?.balanceCents ?? 0,
  }, '充值成功')
})
