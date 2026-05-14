/**
 * JWT 认证工具
 */
import { NextRequest } from 'next/server'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-jwt-secret-key-at-least-32-chars!!'
)

export interface JwtPayload {
  sub: string       // user id (string)
  username: string
  role: 'user' | 'admin'
  iat?: number
  exp?: number
}

/** 签发 Access Token（默认 1 小时） */
export async function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '1h')
    .sign(JWT_SECRET)
}

/** 验证 Token，返回 payload 或 null */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JwtPayload
  } catch {
    return null
  }
}

/** 从请求头提取并验证 Bearer Token */
export async function getAuthUser(req: NextRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  return verifyToken(token)
}

/** 要求已登录（返回 payload 或抛出 401 信号） */
export async function requireAuth(req: NextRequest): Promise<JwtPayload> {
  const user = await getAuthUser(req)
  if (!user) throw new AuthError('未登录或 Token 已过期', 401)
  return user
}

/** 要求管理员权限 */
export async function requireAdmin(req: NextRequest): Promise<JwtPayload> {
  const user = await requireAuth(req)
  if (user.role !== 'admin') throw new AuthError('权限不足，需要管理员身份', 403)
  return user
}

/** 认证异常类 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/** API 路由错误处理包装器（自动捕获 AuthError） */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number = 400,
    public readonly code: number = httpStatus
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
