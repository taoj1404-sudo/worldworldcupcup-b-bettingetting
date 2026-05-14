/**
 * 排行榜 API
 * GET /api/leaderboard - 获取用户排行榜
 *
 * 缓存策略：
 * - Redis 缓存 30 秒（排行榜变动不频繁）
 * - 无 Redis 时正常降级查数据库
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, wallets } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { cacheGet, cacheSet, cacheKeys } from '@/lib/redis/client';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));

    // 尝试从 Redis 缓存读取
    const cacheKey = cacheKeys.leaderboard(limit)
    const cached = await cacheGet<{ leaderboard: any[]; totalParticipants: number }>(cacheKey, { prefix: 'lb', ttl: 30 })

    let formattedLeaderboard: any[]
    let totalParticipants: number

    if (cached) {
      formattedLeaderboard = cached.leaderboard
      totalParticipants = cached.totalParticipants
    } else {
      // 构建查询 - 获取按钱包余额排名的用户
      const leaderboardQuery = db
        .select({
          userId: users.id,
          username: users.username,
          balanceCents: wallets.balanceCents,
        })
        .from(users)
        .leftJoin(wallets, eq(users.id, wallets.userId))
        .where(eq(users.status, 'active'))
        .orderBy(desc(sql`COALESCE(${wallets.balanceCents}, 0)`))
        .limit(limit);

      const leaderboard = await leaderboardQuery;

      // 格式化数据，添加排名（余额转为元）
      formattedLeaderboard = leaderboard.map((item, index) => ({
        rank: index + 1,
        userId: item.userId,
        username: item.username,
        balance: Math.round((Number(item.balanceCents) || 0) / 100),
      }));
      totalParticipants = formattedLeaderboard.length

      // 写入缓存
      await cacheSet(cacheKey, { leaderboard: formattedLeaderboard, totalParticipants }, { prefix: 'lb', ttl: 30 })
    }

    // 获取当前用户排名（如果有 token）
    let userRank: number | null = null;
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const myId = Number(payload.sub);
        const myPos = formattedLeaderboard.findIndex(item => item.userId === myId);
        if (myPos >= 0) userRank = myPos + 1;
      } catch {
        // token 无效，忽略
      }
    }

    return NextResponse.json({
      code: 0,
      data: {
        leaderboard: formattedLeaderboard,
        userRank,
        totalParticipants,
      },
    });

  } catch (error: any) {
    console.error('[leaderboard] 错误:', error.message);
    return NextResponse.json(
      { error: '服务器错误: ' + error.message },
      { status: 500 }
    );
  }
};
