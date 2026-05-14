import { NextRequest } from 'next/server'
import { ok, unauthorized, badRequest, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { refreshTokens } from '@/db/queries/auth'

async function handleRefresh(req: NextRequest) {
  const body = await req.json()
  const refreshToken = body.refreshToken

  if (!refreshToken || typeof refreshToken !== 'string') {
    return badRequest('refreshToken 不能为空')
  }

  try {
    const tokens = await refreshTokens(refreshToken)
    return ok(tokens)
  } catch (err: any) {
    console.error('[refresh]', err)
    return unauthorized(err.message || 'Token 刷新失败')
  }
}

export const POST = withHandler(handleRefresh)
