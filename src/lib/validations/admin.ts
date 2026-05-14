/**
 * 管理员相关验证 Schema
 */
import { z } from 'zod'

// ─── 用户状态/角色更新 ───────────────────────────────
export const UpdateUserSchema = z.object({
  status: z.enum(['active', 'frozen', 'pending']).optional(),
  role: z.enum(['user', 'admin']).optional(),
})

// ─── 管理员批量结算（支持自动判定胜负） ─────────────
export const AdminSettleMatchSchema = z.object({
  body: z.object({
    match_id: z.number().int().positive('比赛 ID 无效'),
    // 若不传 resultsMap，则自动按胜平负判断
    resultsMap: z
      .record(z.string(), z.enum(['home', 'draw', 'away']))
      .optional()
      .describe('赔率ID → 结果 的手动映射（覆盖自动判定）'),
  }),
})

// ─── 管理员单注结算（手动判定） ─────────────────────
export const AdminSettleSingleSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({
    result: z.enum(['won', 'lost', 'cancelled'], {
      message: '结果必须是 won / lost / cancelled',
    }),
    actualPayoutCents: z.number().int().min(0).optional().describe('手动指定赔付金额（可选，默认用赔率快照计算）'),
  }),
})
