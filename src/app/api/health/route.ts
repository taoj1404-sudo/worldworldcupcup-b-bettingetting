/**
 * GET /api/health — 健康检查接口
 * 用于 Docker 健康检查和服务监控
 */
import { NextResponse } from 'next/server'

export const GET = async () => {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'worldcup-betting',
    version: process.env.npm_package_version || '1.0.0',
  })
}
