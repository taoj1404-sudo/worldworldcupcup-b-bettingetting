/**
 * 赔率相关 Zod 验证 Schema
 */
import { z } from 'zod'

// ─── 创建赔率（单条） ─────────────────────────────────────
export const createOddsItemSchema = z.object({
  betTypeId: z.number().int().positive('投注类型 ID 无效'),
  option: z.string().min(1).max(50),
  optionLabel: z.string().min(1).max(100),
  value: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, '赔率格式不正确（如 1.8500）')
    .refine((v) => parseFloat(v) >= 1.01, '赔率不能低于 1.01')
    .refine((v) => parseFloat(v) <= 1000, '赔率不能超过 1000'),
  handicap: z.string().regex(/^-?\d+(\.\d{1,2})?$/).optional(),
  line: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
})

// ─── 批量创建赔率 ─────────────────────────────────────────
export const createOddsSchema = z.object({
  matchId: z.number().int().positive('比赛 ID 无效'),
  items: z.array(createOddsItemSchema).min(1, '至少需要一条赔率').max(50),
})

export type CreateOddsInput = z.infer<typeof createOddsSchema>

// ─── 更新赔率值 ───────────────────────────────────────────
export const updateOddsSchema = z.object({
  value: z
    .string()
    .regex(/^\d+(\.\d{1,4})?$/, '赔率格式不正确')
    .refine((v) => parseFloat(v) >= 1.01, '赔率不能低于 1.01')
    .refine((v) => parseFloat(v) <= 1000, '赔率不能超过 1000'),
  reason: z.string().max(255).optional(),
})

export type UpdateOddsInput = z.infer<typeof updateOddsSchema>

// ─── 暂停/恢复赔率 ────────────────────────────────────────
export const suspendOddsSchema = z.object({
  suspend: z.boolean(),
})

export type SuspendOddsInput = z.infer<typeof suspendOddsSchema>
