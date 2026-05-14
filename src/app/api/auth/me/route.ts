import { NextRequest } from 'next/server'
import { ok, unauthorized, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { requireAuth } from '@/lib/api/auth'
import { findUserById, getAccountStats } from '@/db/queries/auth'

async function handleMe(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    const userId = parseInt(auth.sub, 10)
    const user = await findUserById(userId)
    if (!user) return unauthorized('用户不存在')

    const stats = await getAccountStats(userId)

    return ok({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      balanceCents: stats?.balanceCents ?? 0,
      totalBets: stats?.totalBets ?? 0,
      totalWonCents: stats?.totalWonCents ?? 0,
      totalLostCents: stats?.totalLostCents ?? 0,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })
  } catch (err: any) {
    if (err.name === 'AuthError') return unauthorized('请先登录')
    console.error('[me]', err)
    return internalError('获取用户信息失败')
  }
}

export const GET = withHandler(handleMe)
