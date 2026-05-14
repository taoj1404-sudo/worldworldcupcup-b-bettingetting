/**
 * GET  /api/admin/users — 用户列表（支持搜索/筛选）
 * POST /api/admin/users — 创建管理员账户（仅超级管理员）
 */
import { NextRequest } from 'next/server'
import { db } from '@/db'
import { eq, desc, sql, like, and, inArray } from 'drizzle-orm'
import { users } from '@/db/schema'
import { requireAdmin } from '@/lib/api/auth'
import { withHandler, ok, created, badRequest, notFound } from '@/lib/api'

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin(req)

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
  const offset = (page - 1) * pageSize
  const status = searchParams.get('status') ?? undefined
  const role = searchParams.get('role') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const conditions = []
  if (status) conditions.push(eq(users.status, status as 'active' | 'frozen' | 'pending'))
  if (role) conditions.push(eq(users.role, role as 'user' | 'admin'))
  if (search) {
    conditions.push(
      sql`(${users.username} ILIKE ${'%' + search + '%'} OR ${users.email} ILIKE ${'%' + search + '%'})`
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        status: users.status,
        balanceCents: users.balanceCents,
        totalBets: users.totalBets,
        totalWonCents: users.totalWonCents,
        totalLostCents: users.totalLostCents,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(whereClause),
  ])

  return ok({
    users: rows.map((u) => ({
      ...u,
      balanceCents: Number(u.balanceCents ?? 0),
      totalBets: Number(u.totalBets ?? 0),
      totalWonCents: Number(u.totalWonCents ?? 0),
      totalLostCents: Number(u.totalLostCents ?? 0),
    })),
    pagination: {
      page,
      pageSize,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / pageSize),
    },
  })
})
