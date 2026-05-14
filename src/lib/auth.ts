import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

/* ===================== 密码 ===================== */

/** 加密密码 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/** 验证密码 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ===================== JWT ===================== */

interface AccessTokenPayload extends JWTPayload {
  userId: number;
  email: string;
  role: string;
}

interface RefreshTokenPayload extends JWTPayload {
  userId: number;
}

/** 生成 Access Token（1h） */
export async function generateAccessToken(
  userId: number,
  email: string,
  role: string,
): Promise<string> {
  return new SignJWT({ userId, email, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(process.env.JWT_EXPIRES_IN || '1h')
    .sign(JWT_SECRET);
}

/** 生成 Refresh Token（30d） */
export async function generateRefreshToken(userId: number): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(process.env.JWT_REFRESH_EXPIRES_IN || '30d')
    .sign(JWT_REFRESH_SECRET);
}

/** 验证 Access Token */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  return payload as AccessTokenPayload;
}

/** 验证 Refresh Token */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
  return payload as RefreshTokenPayload;
}

/* ===================== 兼容旧接口 ===================== */
/* wallet 路由 import { verifyToken } from '@/lib/auth' */

/** 验证 Token（兼容旧接口，默认验证 access token） */
export async function verifyToken(token: string): Promise<AccessTokenPayload> {
  return verifyAccessToken(token);
}
