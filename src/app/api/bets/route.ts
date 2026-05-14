/**
 * POST /api/bets  — 用户下注
 * GET  /api/bets  — 获取当前用户的投注列表
 */
import { NextRequest } from 'next/server'
import { withHandler, ok, badRequest, notFound, unauthorized } from '@/lib/api'
import { CreateBetSchema, ListBetsSchema } from '@/lib/validations/bets'
import { placeBet, listBets } from '@/db/queries/bets'
import { requireAuth } from '@/lib/api/auth'

type Context = { params?: Promise<Record<string, string>> }

export const POST = withHandler(async (req: NextRequest, context: Context) => {
  const auth = await requireAuth(req)
  const userId = parseInt(auth.sub, 10)

  const body = await req.json().catch(() => null)
  console.log('[BETS_POST] Raw body:', JSON.stringify(body))
  console.log('[BETS_POST] Body type:', typeof body)
  if (!body) return badRequest('请求体无效')

  // 直接验证 body，不包装
  const parsed = CreateBetSchema.safeParse(body)
  console.log('[BETS_POST] Parse result:', parsed.success ? 'success' : 'failed')
  if (!parsed.success) {
    console.error('[BET_VALIDATION_ERROR]', JSON.stringify(parsed.error.issues, null, 2))
    return badRequest(parsed.error.issues[0].message)
  }

  let result: any;
  try {
    result = await placeBet(parsed.data, { sub: String(userId), username: auth.sub, role: 'user' } as any)
  } catch (e: any) {
    console.error('[PLACE_BET_ERROR]', e.message, e.constructor.name)
    if (e instanceof Error && e.message) return badRequest(e.message)
    throw e
  }

  return ok({
    bet_id: result.bet.id,
    new_balance: result.newBalance,
  }, result.alreadyExists ? '投注已存在' : '下注成功')
})

export const GET = withHandler(async (req: NextRequest, context: Context) => {
  const auth = await requireAuth(req)
  const userId = parseInt(auth.sub, 10)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const rawStatus = searchParams.get('status')
  const status = rawStatus as 'pending' | 'won' | 'lost' | 'cancelled' | undefined

  const bets = await listBets({ userId, page, pageSize, status })

  return ok(bets)
})
