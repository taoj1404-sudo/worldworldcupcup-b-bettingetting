import { z } from 'zod'

// 下注请求（扁平格式）
export const CreateBetSchema = z.object({
  odds_id: z.number().int().positive('赔率 ID 无效'),
  selection: z.enum(['home', 'draw', 'away'], {
    message: '选项必须是 home / draw / away',
  }),
  amount_cents: z
    .number()
    .int()
    .min(100, '最低投注 1 元（100分）')
    .max(10_000_000, '单注最高 10 万元（100000分）'),
  idempotency_key: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, '幂等键格式无效'),
})

// 投注列表查询
export const ListBetsSchema = z.object({
  query: z.object({
    user_id: z.coerce.number().int().positive().optional(),
    status: z.enum(['pending', 'won', 'lost', 'cancelled']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
})

// 投注详情查询
export const GetBetSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
})

// 管理员批量结算（扁平格式）
export const SettleBetsSchema = z.object({
  match_id: z.number().int().positive('比赛 ID 无效'),
  // resultsMap 用于手动覆盖自动判定（如特殊比分规则）
  // Key: odds_id, Value: 'home' | 'draw' | 'away'
  resultsMap: z.record(z.number(), z.enum(['home', 'draw', 'away'])).optional(),
})

// 管理员单注结算
export const SettleSingleBetSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    result: z.enum(['won', 'lost', 'cancelled'], {
      message: '结果必须是 won / lost / cancelled',
    }),
    actualPayoutCents: z.number().int().nonnegative().optional(),
  }),
})

export type CreateBetInput = z.infer<typeof CreateBetSchema>
export type ListBetsInput = z.infer<typeof ListBetsSchema>['query']
export type SettleBetsInput = z.infer<typeof SettleBetsSchema>
export type SettleSingleBetInput = z.infer<typeof SettleSingleBetSchema>
