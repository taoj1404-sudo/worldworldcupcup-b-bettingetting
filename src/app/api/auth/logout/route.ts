import { NextRequest } from 'next/server'
import { ok } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { verifyAccess, blacklistToken } from '@/lib/api/jwt'

async function handleLogout(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (accessToken) {
    try {
      const payload = await verifyAccess(accessToken)
      if (payload.jti) blacklistToken(payload.jti, 15 * 60)
    } catch { /* ignore */ }
  }

  return ok({ message: '已安全退出' })
}

export const POST = withHandler(handleLogout)
