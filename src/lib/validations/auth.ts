import { z } from 'zod'

// Register
export const registerSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(50, '最多 50 个字符').regex(/^[a-zA-Z0-9_]+$/, '只能包含字母、数字和下划线'),
  email: z.string().email('无效的邮箱格式'),
  password: z.string().min(8, '密码至少 8 个字符').max(128, '最多 128 个字符'),
  referralCode: z.string().optional(),
})
export type RegisterInput = z.infer<typeof registerSchema>

// Login
export const loginSchema = z.object({
  email: z.string().email('无效的邮箱格式'),
  password: z.string().min(1, '请输入密码'),
})
export type LoginInput = z.infer<typeof loginSchema>

// Change Password
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '新密码至少 8 个字符').max(128, '最多 128 个字符'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: '两次密码输入不一致', path: ['confirmPassword'] })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

// Reset Password (via email link)
export const resetPasswordSchema = z.object({
  email: z.string().email('无效的邮箱格式'),
  token: z.string().min(1, 'Token 不能为空'),
  newPassword: z.string().min(8, '新密码至少 8 个字符').max(128, '最多 128 个字符'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: '两次密码输入不一致', path: ['confirmPassword'] })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// Forgot Password
export const forgotPasswordSchema = z.object({ email: z.string().email('无效的邮箱格式') })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
