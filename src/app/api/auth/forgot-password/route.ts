import { NextRequest } from 'next/server'
import { ok } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { findUserByEmail } from '@/db/queries/auth'

async function handleForgotPassword(req: NextRequest) {
  const body = await req.json()
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  // 安全：不提示邮箱是否存在，防止枚举攻击
  const user = await findUserByEmail(parsed.data.email)

  if (user) {
    // TODO: 生成 reset token，存入数据库，并发送邮件
    // const resetToken = crypto.randomUUID()
    // await db.update(users).set({ resetToken }).where(eq(users.id, user.id))
    // await sendResetEmail(user.email, resetToken)
  }

  return ok({ message: '如果该邮箱已注册，我们已发送密码重置链接到您的邮箱' })
}

export const POST = withHandler(handleForgotPassword)
