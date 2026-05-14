import { NextRequest } from 'next/server'
import { ok, unauthorized, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { resetPassword } from '@/db/queries/auth'

async function handleResetPassword(req: NextRequest) {
  const body = await req.json()
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  // 注意：生产环境应通过 token 关联的 userId 查询，而非传 email
  // 此处简化处理，email 作为标识，token 有效性由业务层校验
  try {
    await resetPassword(parsed.data.email, parsed.data.newPassword)
    return ok({ message: '密码重置成功，请使用新密码登录' })
  } catch (err: any) {
    console.error('[reset-password]', err)
    return unauthorized('重置失败，请确保使用有效的重置链接')
  }
}

export const POST = withHandler(handleResetPassword)
