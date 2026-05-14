/**
 * 统一 API 响应格式工具
 */
import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = {
  code: number
  message: string
  data: T | null
}

/** 成功响应 */
export function ok<T>(data: T, message = 'success', status = 200): NextResponse {
  return NextResponse.json({ code: 0, message, data } satisfies ApiResponse<T>, { status })
}

/** 创建成功 */
export function created<T>(data: T, message = 'created'): NextResponse {
  return ok(data, message, 201)
}

/** 错误响应 */
export function err(
  message: string,
  code = 400,
  httpStatus?: number
): NextResponse {
  return NextResponse.json(
    { code, message, data: null } satisfies ApiResponse,
    { status: httpStatus ?? code }
  )
}

// ─── 语义化错误快捷函数 ───────────────────────────────────

export const badRequest = (msg: string) => err(msg, 400, 400)
export const unauthorized = (msg = '未登录或 Token 已过期') => err(msg, 401, 401)
export const forbidden = (msg = '权限不足') => err(msg, 403, 403)
export const notFound = (msg = '资源不存在') => err(msg, 404, 404)
export const conflict = (msg: string) => err(msg, 409, 409)
export const unprocessable = (msg: string) => err(msg, 422, 422)
export const tooManyRequests = (msg = '请求过于频繁，请稍后重试') => err(msg, 429, 429)
export const internalError = (msg = '服务器内部错误') => err(msg, 500, 500)
