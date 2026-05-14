import { NextRequest } from 'next/server'
import { ok, unauthorized, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { loginSchema } from '@/lib/validations/auth'
import { loginUser } from '@/db/queries/auth'

async function handleLogin(req: NextRequest) {
  const body = await req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  try {
    const { user, tokens } = await loginUser(parsed.data.email, parsed.data.password)
    return ok({ user, ...tokens })
  } catch (err: any) {
    if (err.message.includes('邮箱') || err.message.includes('冻结') || err.message.includes('激活')) {
      return unauthorized(err.message)
    }
    console.error('[login]', err)
    return internalError('登录失败，请稍后重试')
  }
}

export const POST = withHandler(handleLogin)
