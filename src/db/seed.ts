/**
 * 数据库种子脚本
 * 初始化默认投注类型 + 2026 世界杯测试赛程
 *
 * 运行：npx tsx src/db/seed.ts
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'
import { eq, and } from 'drizzle-orm'
import { betTypes } from './schema/betTypes'
import { matches } from './schema/matches'
import { odds } from './schema/odds'
import { users } from './schema/users'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

// ─── 1. 默认投注类型 ──────────────────────────────────────
const DEFAULT_BET_TYPES = [
  {
    code: 'result_1x2',
    name: '胜平负',
    nameEn: 'Match Result (1X2)',
    category: 'result' as const,
    description: '预测比赛最终结果：主胜(1)、平局(X)、客胜(2)',
    isActive: 'true',
    sortOrder: 1,
  },
  {
    code: 'handicap',
    name: '让球胜负',
    nameEn: 'Asian Handicap',
    category: 'handicap' as const,
    description: '给弱队让球，使赔率更均衡',
    isActive: 'true',
    sortOrder: 2,
  },
  {
    code: 'over_under',
    name: '大小球',
    nameEn: 'Over/Under',
    category: 'over_under' as const,
    description: '预测全场总进球数是否超过基准线',
    isActive: 'true',
    sortOrder: 3,
  },
  {
    code: 'exact_score',
    name: '波胆',
    nameEn: 'Correct Score',
    category: 'exact_score' as const,
    description: '预测比赛精确比分',
    isActive: 'true',
    sortOrder: 4,
  },
  {
    code: 'half_full',
    name: '半全场',
    nameEn: 'Half Time / Full Time',
    category: 'half_full' as const,
    description: '分别预测半场和全场胜负结果的组合',
    isActive: 'true',
    sortOrder: 5,
  },
  {
    code: 'both_score',
    name: '双方进球',
    nameEn: 'Both Teams To Score',
    category: 'both_score' as const,
    description: '预测两队是否都能进球',
    isActive: 'true',
    sortOrder: 6,
  },
]

// ─── 2. 默认管理员账号 ────────────────────────────────────
async function seedAdminUser() {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, 'admin@worldcup.bet'))
    .limit(1)

  if (existing[0]) {
    console.log('  ⏭  管理员账号已存在，跳过')
    return
  }

  const passwordHash = await bcrypt.hash('Admin@2026!', 12)
  await db.insert(users).values({
    username: 'admin',
    email: 'admin@worldcup.bet',
    passwordHash,
    role: 'admin',
    status: 'active',
    balanceCents: '0',
  })
  console.log('  ✅ 创建管理员账号：admin@worldcup.bet / Admin@2026!')
}

// ─── 3. 2026 世界杯小组赛示例赛程 ────────────────────────
const SAMPLE_MATCHES = [
  // A 组
  {
    teamHome: '巴西', teamAway: '塞尔维亚',
    teamHomeCode: 'BRA', teamAwayCode: 'SRB',
    stage: 'group_a' as const,
    venue: '墨西哥城阿兹特克球场', city: '墨西哥城', country: '墨西哥',
    scheduledAt: new Date('2026-06-11T20:00:00-06:00'),
  },
  {
    teamHome: '阿根廷', teamAway: '澳大利亚',
    teamHomeCode: 'ARG', teamAwayCode: 'AUS',
    stage: 'group_b' as const,
    venue: '洛杉矶玫瑰碗', city: '洛杉矶', country: '美国',
    scheduledAt: new Date('2026-06-12T19:00:00-07:00'),
  },
  {
    teamHome: '法国', teamAway: '摩洛哥',
    teamHomeCode: 'FRA', teamAwayCode: 'MAR',
    stage: 'group_c' as const,
    venue: '达拉斯AT&T球场', city: '达拉斯', country: '美国',
    scheduledAt: new Date('2026-06-13T19:00:00-05:00'),
  },
  {
    teamHome: '英格兰', teamAway: '荷兰',
    teamHomeCode: 'ENG', teamAwayCode: 'NED',
    stage: 'group_d' as const,
    venue: '温哥华BC广场', city: '温哥华', country: '加拿大',
    scheduledAt: new Date('2026-06-14T18:00:00-07:00'),
  },
  {
    teamHome: '西班牙', teamAway: '德国',
    teamHomeCode: 'ESP', teamAwayCode: 'GER',
    stage: 'group_e' as const,
    venue: '迈阿密硬石球场', city: '迈阿密', country: '美国',
    scheduledAt: new Date('2026-06-15T20:00:00-04:00'),
  },
]

// ─── 4. 创建示例赔率 ──────────────────────────────────────
async function createSampleOdds(matchId: number, betTypeId: number) {
  // 胜平负基础赔率
  await db.insert(odds).values([
    {
      matchId,
      betTypeId,
      option: 'home',
      optionLabel: '主胜',
      value: '1.8500',
    },
    {
      matchId,
      betTypeId,
      option: 'draw',
      optionLabel: '平局',
      value: '3.4000',
    },
    {
      matchId,
      betTypeId,
      option: 'away',
      optionLabel: '客胜',
      value: '4.2000',
    },
  ])
}

// ─── 主函数 ───────────────────────────────────────────────
async function main() {
  console.log('\n🌱 开始执行数据库种子脚本...\n')

  // 1. 投注类型
  console.log('📋 写入投注类型...')
  for (const bt of DEFAULT_BET_TYPES) {
    const existing = await db
      .select()
      .from(betTypes)
      .where(eq(betTypes.code, bt.code))
      .limit(1)

    if (existing[0]) {
      console.log(`  ⏭  已存在：${bt.name}`)
      continue
    }
    await db.insert(betTypes).values(bt)
    console.log(`  ✅ 创建：${bt.name}（${bt.code}）`)
  }

  // 2. 管理员账号
  console.log('\n👤 创建管理员账号...')
  await seedAdminUser()

  // 3. 示例赛程
  console.log('\n⚽ 写入示例赛程...')
  // 获取胜平负 betType ID
  const [resultBetType] = await db
    .select()
    .from(betTypes)
    .where(eq(betTypes.code, 'result_1x2'))
    .limit(1)

  for (const matchData of SAMPLE_MATCHES) {
    const bettingClosesAt = new Date(matchData.scheduledAt.getTime() - 60 * 60 * 1000)

    const [existing] = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.teamHomeCode, matchData.teamHomeCode),
          eq(matches.teamAwayCode, matchData.teamAwayCode)
        )
      )
      .limit(1)

    if (existing) {
      console.log(`  ⏭  已存在：${matchData.teamHome} vs ${matchData.teamAway}`)
      continue
    }

    const [match] = await db
      .insert(matches)
      .values({ ...matchData, bettingClosesAt })
      .returning()

    console.log(`  ✅ 创建：${matchData.teamHome} vs ${matchData.teamAway}（ID: ${match.id}）`)

    // 为每场比赛创建胜平负赔率
    if (resultBetType) {
      await createSampleOdds(match.id, resultBetType.id)
      console.log(`     └─ 赔率已创建（胜平负）`)
    }
  }

  console.log('\n✨ 种子脚本执行完成！\n')
  await pool.end()
}

// drizzle helpers 已直接从 drizzle-orm 导入

main().catch((err) => {
  console.error('❌ 种子脚本执行失败:', err)
  pool.end()
  process.exit(1)
})
