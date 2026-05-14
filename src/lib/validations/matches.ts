/**
 * 比赛相关 Zod 验证 Schema
 */
import { z } from 'zod'

// ─── 创建比赛 ─────────────────────────────────────────────
export const createMatchSchema = z.object({
  teamHome: z.string().min(1, '主队名称不能为空').max(100),
  teamAway: z.string().min(1, '客队名称不能为空').max(100),
  teamHomeCode: z
    .string()
    .length(3, '队伍代码必须为 3 位 ISO 字母')
    .regex(/^[A-Z]{3}$/, '队伍代码必须为大写字母'),
  teamAwayCode: z
    .string()
    .length(3, '队伍代码必须为 3 位 ISO 字母')
    .regex(/^[A-Z]{3}$/, '队伍代码必须为大写字母'),
  teamHomeFlagUrl: z.string().url().optional(),
  teamAwayFlagUrl: z.string().url().optional(),
  stage: z.enum([
    'group_a', 'group_b', 'group_c', 'group_d',
    'group_e', 'group_f', 'group_g', 'group_h',
    'round_of_32', 'round_of_16',
    'quarter_final', 'semi_final', 'third_place', 'final',
  ]),
  venue: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  scheduledAt: z.string().datetime({ message: '开赛时间格式不正确（需 ISO 8601）' }),
  // 投注截止时间，默认为开赛前 1 小时
  bettingClosesAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
})

export type CreateMatchInput = z.infer<typeof createMatchSchema>

// ─── 更新比分 ─────────────────────────────────────────────
export const updateScoreSchema = z.object({
  scoreHome: z.number().int().min(0).max(99),
  scoreAway: z.number().int().min(0).max(99),
  halfScoreHome: z.number().int().min(0).max(99).optional(),
  halfScoreAway: z.number().int().min(0).max(99).optional(),
  matchMinute: z.number().int().min(0).max(120).optional(),
})

export type UpdateScoreInput = z.infer<typeof updateScoreSchema>

// ─── 更新比赛状态 ─────────────────────────────────────────
export const updateMatchStatusSchema = z.object({
  status: z.enum(['scheduled', 'live', 'finished', 'cancelled', 'postponed']),
  notes: z.string().max(500).optional(),
})

export type UpdateMatchStatusInput = z.infer<typeof updateMatchStatusSchema>

// ─── 查询比赛列表参数 ─────────────────────────────────────
export const listMatchesQuerySchema = z.object({
  status: z
    .enum(['scheduled', 'live', 'finished', 'cancelled', 'postponed'])
    .optional(),
  stage: z
    .enum([
      'group_a', 'group_b', 'group_c', 'group_d',
      'group_e', 'group_f', 'group_g', 'group_h',
      'round_of_32', 'round_of_16',
      'quarter_final', 'semi_final', 'third_place', 'final',
    ])
    .optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListMatchesQuery = z.infer<typeof listMatchesQuerySchema>
