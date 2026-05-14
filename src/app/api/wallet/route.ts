/**
 * 钱包 API 路由
 * GET /api/wallet - 获取钱包信息及交易历史
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, transactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
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

    // 获取或创建钱包
    let userWallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (!userWallet.length) {
      const w = await db.insert(wallets).values({ userId, currency: 'CNY' }).returning();
      userWallet = w;
    }
    const wallet = userWallet[0];

    // 获取交易历史
    const history = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountCents: transactions.amountCents,
        balanceBeforeCents: transactions.balanceBeforeCents,
        balanceAfterCents: transactions.balanceAfterCents,
        remark: transactions.remark,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(eq(transactions.walletId, wallet.id))
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    return NextResponse.json({
      code: 0,
      data: {
        wallet: {
          id: wallet.id,
          balance: Number(wallet.balanceCents) / 100,
          frozenBalance: Number(wallet.frozenCents) / 100,
          availableBalance: (Number(wallet.balanceCents) - Number(wallet.frozenCents)) / 100,
          currency: wallet.currency,
        },
        history: history.map(t => ({
          id: t.id,
          type: t.type,
          amount: Number(t.amountCents) / 100,
          balanceBefore: Number(t.balanceBeforeCents) / 100,
          balanceAfter: Number(t.balanceAfterCents) / 100,
          description: t.remark,
          createdAt: t.createdAt,
        })),
      },
    });

  } catch (error: any) {
    console.error('[wallet] 错误:', error.message);
    return NextResponse.json({ error: '服务器错误: ' + error.message }, { status: 500 });
  }
};
