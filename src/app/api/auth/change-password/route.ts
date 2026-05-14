import { NextRequest } from 'next/server'
import { ok, badRequest, unauthorized, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { changePasswordSchema } from '@/lib/validations/auth'
import { requireAuth } from '@/lib/api/auth'
import { changePassword } from '@/db/queries/auth'

async function handleChangePassword(req: NextRequest) {
  const body = await req.json()
  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  try {
    const auth = await requireAuth(req)
    const userId = parseInt(auth.sub, 10)
    await changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword)
    return ok({ message: '密码修改成功' })
  } catch (err: any) {
    if (err.name === 'AuthError') return unauthorized('请先登录')
    if (err.message === '当前密码错误') return badRequest(err.message)
    console.error('[change-password]', err)
    return internalError('密码修改失败，请稍后重试')
  }
}

export const POST = withHandler(handleChangePassword)
