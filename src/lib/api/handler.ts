/**
 * API 路由处理器包装器
 * 统一捕获错误，转换为标准响应格式
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AuthError, ApiError } from './auth'
import { badRequest, unauthorized, forbidden, internalError, err } from './response'

type Handler = (req: NextRequest, context?: any) => Promise<NextResponse>

/**
 * 包装 API 路由，统一处理异常
 *
 * @example
 * export const GET = withHandler(async (req) => {
 *   // ... 业务逻辑
 * })
 */
export function withHandler(handler: Handler): Handler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context)
    } catch (error) {
      // Zod 验证错误
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0]
        const fieldPath = firstIssue.path.join('.')
        const message = fieldPath
          ? `字段 [${fieldPath}] 验证失败：${firstIssue.message}`
          : firstIssue.message
        return badRequest(message)
      }

      // 认证/权限错误
      if (error instanceof AuthError) {
        return error.status === 403 ? forbidden(error.message) : unauthorized(error.message)
      }

      // 业务逻辑错误
      if (error instanceof ApiError) {
        return err(error.message, error.code, error.httpStatus)
      }

      // 未知错误
      console.error('[API Error]', error)
      return internalError()
    }
  }
}

/**
 * 解析并验证 JSON 请求体（配合 Zod schema 使用）
 */
export async function parseBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  const body = await req.json().catch(() => {
    throw new ApiError('请求体不是合法的 JSON 格式', 400)
  })
  return schema.parse(body) // Zod 会在失败时抛出 ZodError
}

/**
 * 解析 URL 搜索参数
 */
export function parseSearchParams(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams
}

/**
 * 解析分页参数（page/pageSize）
 */
export function parsePagination(req: NextRequest): { limit: number; offset: number } {
  const sp = parseSearchParams(req)
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '20', 10)))
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
  }
}
