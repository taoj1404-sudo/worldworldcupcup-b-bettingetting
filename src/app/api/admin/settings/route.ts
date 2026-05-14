/**
 * GET  /api/admin/settings — 查询可配置的环境变量（脱敏）
 * POST /api/admin/settings — 更新 API Key（写入 .env.local + 热更新 process.env）
 *
 * 注意：Next.js 的环境变量在启动时加载，写入 .env.local 后需重启才能完全生效。
 * 但通过同时更新 process.env 可以让当前进程的后续请求立即生效。
 */
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok, badRequest } from '@/lib/api'
import * as fs from 'fs'
import * as path from 'path'

// 允许通过后台界面配置的键名白名单
const CONFIGURABLE_KEYS = [
  'API_FOOTBALL_KEY',
  'API_FOOTBALL_HOST',
  'THE_ODDS_API_KEY',
  'SYNC_INTERVAL_LIVE',
  'SYNC_INTERVAL_SCHEDULED',
]

// .env.local 路径（项目根目录）
const ENV_LOCAL_PATH = path.resolve(process.cwd(), '.env.local')

function readEnvLocal(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8')
    const result: Record<string, string> = {}
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      let value = trimmed.slice(eqIdx + 1).trim()
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      result[key] = value
    }
    return result
  } catch {
    return {}
  }
}

function writeEnvLocal(updates: Record<string, string>): void {
  let content = ''
  try {
    content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8')
  } catch {
    // 文件不存在，创建空文件
  }

  for (const [key, value] of Object.entries(updates)) {
    const escapedValue = `"${value.replace(/"/g, '\\"')}"`
    const lineRegex = new RegExp(`^(${key}\\s*=).*$`, 'm')
    if (lineRegex.test(content)) {
      // 替换已有行
      content = content.replace(lineRegex, `$1${escapedValue}`)
    } else {
      // 追加新行
      content += `\n${key}=${escapedValue}\n`
    }
  }

  fs.writeFileSync(ENV_LOCAL_PATH, content, 'utf-8')
}

// GET — 查询可配置项（Key 脱敏处理）
export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const envLocal = readEnvLocal()
  const settings = CONFIGURABLE_KEYS.map((key) => {
    const value = process.env[key] ?? envLocal[key] ?? ''
    const isKey = key.toLowerCase().includes('key')
    return {
      key,
      value: isKey && value ? `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 4, 20))}` : value,
      configured: !!value,
      isKey,
      description: getKeyDescription(key),
    }
  })

  return ok({
    settings,
    apiFootballConfigured: !!(process.env.API_FOOTBALL_KEY ?? envLocal.API_FOOTBALL_KEY),
    oddsApiConfigured: !!(process.env.THE_ODDS_API_KEY ?? envLocal.THE_ODDS_API_KEY),
  })
})

// POST — 更新配置
export const POST = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, string> = {}

  for (const key of CONFIGURABLE_KEYS) {
    if (body[key] !== undefined && body[key] !== null) {
      const val = String(body[key]).trim()
      updates[key] = val
    }
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('没有需要更新的配置项')
  }

  // 1. 写入 .env.local 文件（持久化）
  try {
    writeEnvLocal(updates)
  } catch (e) {
    console.error('[settings] 写入 .env.local 失败:', e)
    // 即使写入失败，也继续更新 process.env（本次进程内生效）
  }

  // 2. 热更新 process.env（当前进程立即生效，无需重启）
  for (const [key, val] of Object.entries(updates)) {
    if (val) {
      process.env[key] = val
    } else {
      delete process.env[key]
    }
  }

  return ok({
    updated: Object.keys(updates),
    message: 'API Key 已更新，当前会话立即生效',
  })
})

function getKeyDescription(key: string): string {
  const desc: Record<string, string> = {
    API_FOOTBALL_KEY: 'API-Football (RapidAPI) Key — 5大联赛实时赛程与比分',
    API_FOOTBALL_HOST: 'API-Football RapidAPI Host（一般无需修改）',
    THE_ODDS_API_KEY: 'The Odds API Key — 国际赔率数据（可选）',
    SYNC_INTERVAL_LIVE: '实时比赛同步间隔（秒，默认30）',
    SYNC_INTERVAL_SCHEDULED: '赛前赛程同步间隔（秒，默认300）',
  }
  return desc[key] ?? key
}
