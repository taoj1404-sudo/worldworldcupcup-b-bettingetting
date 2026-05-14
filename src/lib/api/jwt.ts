import { SignJWT, jwtVerify } from 'jose'
import { JWTPayload } from 'jose'

export interface TokenPayload extends JWTPayload {
  sub: string
  role: 'user' | 'admin'
  type: 'access' | 'refresh'
  jti?: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

const ACCESS_TTL = 15 * 60
const REFRESH_TTL = 7 * 24 * 60 * 60

function getSecret(env: string): Uint8Array {
  const s = process.env[env]
  if (!s) throw new Error(env + ' env not set')
  return new TextEncoder().encode(s)
}

const blacklisted = new Set<string>()

export function blacklistToken(jti: string, ttl: number): void {
  blacklisted.add(jti)
  setTimeout(() => blacklisted.delete(jti), ttl * 1000)
}

export function isBlacklisted(jti: string): boolean {
  return blacklisted.has(jti)
}

export async function generateTokens(payload: { userId: number; role: 'user' | 'admin' }): Promise<TokenPair> {
  const now = Math.floor(Date.now() / 1000)
  const accessJti = crypto.randomUUID()
  const refreshJti = crypto.randomUUID()

  const [accessToken, refreshToken] = await Promise.all([
    new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(payload.userId))
      .setIssuedAt(now)
      .setExpirationTime(now + ACCESS_TTL)
      .setJti(accessJti)
      .sign(getSecret('JWT_SECRET')),

    new SignJWT({ role: payload.role, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(String(payload.userId))
      .setIssuedAt(now)
      .setExpirationTime(now + REFRESH_TTL)
      .setJti(refreshJti)
      .sign(getSecret('JWT_REFRESH_SECRET')),
  ])

  return { accessToken, refreshToken, expiresIn: ACCESS_TTL }
}

export async function verifyAccess(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_SECRET'), { algorithms: ['HS256'] })
  if ((payload as any).type && (payload as any).type !== 'access') throw new Error('Token type mismatch')
  if ((payload as any).jti && isBlacklisted((payload as any).jti)) throw new Error('Token revoked')
  return payload as TokenPayload
}

export async function verifyRefresh(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'), { algorithms: ['HS256'] })
  if (!(payload as any).type || (payload as any).type !== 'refresh') throw new Error('Invalid refresh token')
  if ((payload as any).jti && isBlacklisted((payload as any).jti)) throw new Error('Refresh token revoked')
  return payload as TokenPayload
}
