/**
 * 钱包历史 API
 * GET /api/wallet/history - 获取交易历史（分页 + 筛选）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, transactions } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { jwtVerify } from 'jose';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export const GET = async (request: NextRequest) => {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: '未授权访问' }, { status: 401 });

    let decoded: any;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      decoded = payload;
    } catch {
      return NextResponse.json({ error: 'Token 无效或已过期' }, { status: 401 });
    }

    const userId = Number(decoded.userId || decoded.sub);
    if (!userId) return NextResponse.json({ error: 'Token 无效' }, { status: 401 });

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 获取用户钱包
    let userWallet = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (!userWallet.length) {
      return NextResponse.json({ code: 0, data: { history: [], pagination: { page, limit, total: 0, totalPages: 0 } } });
    }

    // 构建查询条件
    const conditions: any[] = [eq(transactions.walletId, userWallet[0].id)];
    if (type) conditions.push(eq(transactions.type, type as any));
    if (startDate) conditions.push(gte(transactions.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(transactions.createdAt, new Date(endDate)));

    // 查询交易历史
    const history = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        balanceBefore: transactions.balanceBefore,
        balanceAfter: transactions.balanceAfter,
        description: transactions.description,
        referenceId: transactions.referenceId,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const total = history.length; // 简化：不分页统计总数

    return NextResponse.json({
      code: 0,
      data: {
        history: history.map(t => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amount) / 100,
          balanceBefore: Number(t.balanceBefore) / 100,
          balanceAfter: Number(t.balanceAfter) / 100,
          description: t.description,
          referenceId: t.referenceId,
          createdAt: t.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error: any) {
    console.error('[wallet/history] 错误:', error.message);
    return NextResponse.json({ error: '服务器错误: ' + error.message }, { status: 500 });
  }
};
