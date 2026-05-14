import { z } from 'zod'

// 充值请求
export const CreateDepositSchema = z.object({
  body: z.object({
    amount_cents: z
      .number()
      .int()
      .min(100, '最低充值 1 元')
      .max(10_000_000, '最高单笔 10 万元'),
    payment_method: z.enum(['alipay', 'wechat', 'bank'], {
      message: '支付方式必须是 alipay / wechat / bank',
    }),
  }),
})

// 提现请求
export const CreateWithdrawalSchema = z.object({
  body: z.object({
    amount_cents: z
      .number()
      .int()
      .min(100, '最低提现 1 元')
      .max(10_000_000, '最高单笔 10 万元'),
    bank_card: z.string().min(16).max(23).regex(/^\d{16,19}$/, '银行卡号格式错误'),
    real_name: z.string().min(2).max(50),
  }),
})

// 管理员审核提现
export const ReviewWithdrawalSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    remark: z.string().max(200).optional(),
  }),
})

// 管理员手动调整余额
export const AdjustBalanceSchema = z.object({
  body: z.object({
    user_id: z.number().int().positive('用户 ID 无效'),
    amount_cents: z
      .number()
      .int()
      .refine((v) => v !== 0, '调整金额不能为 0')
      .refine(
        (v) => Math.abs(v) <= 10_000_000,
        '单次调整金额不超过 10 万元',
      ),
    reason: z.string().min(2).max(200),
  }),
})

// 账户统计查询
export const GetAccountStatsSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int().positive(),
  }),
})

export type CreateDepositInput = z.infer<typeof CreateDepositSchema>['body']
export type CreateWithdrawalInput = z.infer<typeof CreateWithdrawalSchema>['body']
export type ReviewWithdrawalInput = z.infer<typeof ReviewWithdrawalSchema>
export type AdjustBalanceInput = z.infer<typeof AdjustBalanceSchema>['body']
