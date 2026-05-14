import { NextRequest } from 'next/server'
import { created, conflict, internalError } from '@/lib/api/response'
import { withHandler } from '@/lib/api/handler'
import { registerSchema } from '@/lib/validations/auth'
import { findUserByEmail, findUserByUsername, createUser } from '@/db/queries/auth'
import { ZodError } from 'zod'

async function handleRegister(req: NextRequest) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) throw parsed.error

  const { username, email, password } = parsed.data

  const existingEmail = await findUserByEmail(email)
  if (existingEmail) return conflict('该邮箱已被注册')

  const existingUsername = await findUserByUsername(username)
  if (existingUsername) return conflict('该用户名已被占用')

  try {
    const user = await createUser({ username, email, password })
    return created({
      message: '注册成功，请登录',
      user: { id: user.id, username: user.username, email: user.email },
    })
  } catch (err: any) {
    if (err.code === '23505') return conflict('该邮箱或用户名已被注册')
    console.error('[register]', err)
    return internalError('服务器错误，请稍后重试')
  }
}

export const POST = withHandler(handleRegister)
