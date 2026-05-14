import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { generateTokens, verifyRefresh, blacklistToken } from '@/lib/api/jwt'

export async function hashPassword(p: string) { return bcrypt.hash(p, 12) }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h) }

export const findUserByEmail = (e: string) =>
  db.query.users.findFirst({ where: eq(users.email, e.toLowerCase()) })

export const findUserByUsername = (u: string) =>
  db.query.users.findFirst({ where: eq(users.username, u) })

export const findUserById = (id: number) =>
  db.query.users.findFirst({ where: eq(users.id, id) })

export async function createUser(data: { username: string; email: string; password: string }) {
  const [user] = await db.insert(users).values({
    username: data.username,
    email: data.email.toLowerCase(),
    passwordHash: await hashPassword(data.password),
    role: 'user',
    status: 'active',
    balanceCents: '0',
    totalBets: '0',
    totalWonCents: '0',
    totalLostCents: '0',
  }).returning({ id: users.id, email: users.email, username: users.username, role: users.role })
  return user
}

export async function loginUser(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('邮箱或密码错误')
  if (user.status === 'frozen') throw new Error('账户已被冻结，请联系客服')
  if (user.status === 'pending') throw new Error('账户尚未激活')
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw new Error('邮箱或密码错误')
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id))
  const tokens = await generateTokens({ userId: user.id, role: user.role as 'user' | 'admin' })
  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role as 'user' | 'admin' },
    tokens,
  }
}

export async function refreshTokens(refreshToken: string) {
  const payload = await verifyRefresh(refreshToken)
  const userId = parseInt(payload.sub, 10)
  const user = await findUserById(userId)
  if (!user) throw new Error('用户不存在')
  if (user.status === 'frozen') throw new Error('账户已被冻结')
  if (payload.jti) blacklistToken(payload.jti, 7 * 24 * 60 * 60)
  return generateTokens({ userId, role: user.role as 'user' | 'admin' })
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = await findUserById(userId)
  if (!user) throw new Error('用户不存在')
  if (!await verifyPassword(currentPassword, user.passwordHash)) throw new Error('当前密码错误')
  await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, userId))
}

export async function resetPassword(email: string, newPassword: string) {
  const user = await findUserByEmail(email)
  if (!user) throw new Error('该邮箱未注册')
  await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, user.id))
}

export async function getAccountStats(userId: number) {
  const user = await findUserById(userId)
  if (!user) return null
  return {
    balanceCents: Number(user.balanceCents ?? 0),
    totalBets: Number(user.totalBets ?? 0),
    totalWonCents: Number(user.totalWonCents ?? 0),
    totalLostCents: Number(user.totalLostCents ?? 0),
  }
}
