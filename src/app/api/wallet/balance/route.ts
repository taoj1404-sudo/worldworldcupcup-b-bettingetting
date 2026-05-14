/**
 * 钱包余额 API
 * GET /api/wallet/balance - 获取当前用户余额
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TextEncoder } from 'node:util';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export const GET = async (request: NextRequest) => {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 验证 token
    let decoded: any;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      decoded = payload;
    } catch (jwtErr: any) {
      console.error('[wallet/balance] JWT 验证失败:', jwtErr.message);
      return NextResponse.json({ error: 'Token 无效或已过期: ' + jwtErr.message }, { status: 401 });
    }

    const userId = decoded.userId || decoded.sub;
    if (!userId) {
      return NextResponse.json({ error: 'Token 中无用户信息' }, { status: 401 });
    }

    // 获取用户钱包
    const userWallet = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, Number(userId)))
      .limit(1);

    if (!userWallet || userWallet.length === 0) {
      // 自动创建钱包
      const newWallet = await db
        .insert(wallets)
        .values({ userId: Number(userId), currency: 'CNY' })
        .returning();
      const w = newWallet[0];
      return NextResponse.json({
        code: 0,
        data: {
          balance: Number(w.balanceCents) / 100,
          frozenBalance: Number(w.frozenCents) / 100,
          availableBalance: (Number(w.balanceCents) - Number(w.frozenCents)) / 100,
          currency: w.currency,
        },
      });
    }

    const wallet = userWallet[0];

    return NextResponse.json({
      code: 0,
      data: {
        balance: Number(wallet.balanceCents) / 100,
        frozenBalance: Number(wallet.frozenCents) / 100,
        availableBalance: (Number(wallet.balanceCents) - Number(wallet.frozenCents)) / 100,
        currency: wallet.currency,
      },
    });

  } catch (error: any) {
    console.error('[wallet/balance] 错误:', error.message, error.stack);
    return NextResponse.json(
      { error: '服务器错误: ' + error.message },
      { status: 500 }
    );
  }
};
