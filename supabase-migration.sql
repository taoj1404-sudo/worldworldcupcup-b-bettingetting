-- ============================================================
-- WorldCup Betting Platform - 数据库迁移脚本
-- 运行方式：Supabase SQL Editor 或 psql
-- ============================================================

-- ============================================================
-- 1. 枚举类型定义
-- ============================================================

-- 用户角色枚举
DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 用户状态枚举
DO $$ BEGIN
  CREATE TYPE "user_status" AS ENUM('active', 'frozen', 'pending');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 比赛状态枚举
DO $$ BEGIN
  CREATE TYPE "match_status" AS ENUM('scheduled', 'live', 'finished', 'cancelled', 'postponed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 比赛阶段枚举
DO $$ BEGIN
  CREATE TYPE "match_stage" AS ENUM(
    'group_a', 'group_b', 'group_c', 'group_d',
    'group_e', 'group_f', 'group_g', 'group_h',
    'round_of_32', 'round_of_16', 'quarter_final',
    'semi_final', 'third_place', 'final'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 投注类型分类枚举
DO $$ BEGIN
  CREATE TYPE "bet_type_category" AS ENUM(
    'result', 'handicap', 'over_under', 'exact_score',
    'half_full', 'both_score', 'special'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 赔率状态枚举
DO $$ BEGIN
  CREATE TYPE "odds_status" AS ENUM('active', 'suspended', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 投注状态枚举
DO $$ BEGIN
  CREATE TYPE "bet_status" AS ENUM(
    'pending', 'won', 'lost', 'void', 'cancelled', 'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 交易类型枚举
DO $$ BEGIN
  CREATE TYPE "transaction_type" AS ENUM(
    'deposit', 'withdraw', 'bet_place', 'bet_win',
    'bet_refund', 'admin_credit', 'admin_debit', 'bonus'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 交易状态枚举
DO $$ BEGIN
  CREATE TYPE "transaction_status" AS ENUM(
    'pending', 'completed', 'failed', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 支付状态枚举
DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM(
    'pending', 'paid', 'approved', 'rejected',
    'completed', 'failed', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 结算状态枚举
DO $$ BEGIN
  CREATE TYPE "settlement_status" AS ENUM(
    'pending', 'processing', 'completed', 'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;


-- ============================================================
-- 2. 数据表定义
-- ============================================================

-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "username" varchar(50) NOT NULL UNIQUE,
  "email" varchar(255) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "role" "user_role" DEFAULT 'user' NOT NULL,
  "status" "user_status" DEFAULT 'active' NOT NULL,
  "balance_cents" numeric(15, 0) DEFAULT '0' NOT NULL,
  "total_bets" numeric(10, 0) DEFAULT '0' NOT NULL,
  "total_won_cents" numeric(15, 0) DEFAULT '0' NOT NULL,
  "total_lost_cents" numeric(15, 0) DEFAULT '0' NOT NULL,
  "phone" varchar(20),
  "is_phone_verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "last_login_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

-- 钱包表
CREATE TABLE IF NOT EXISTS "wallets" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "balance_cents" numeric(15, 0) NOT NULL DEFAULT '0',
  "frozen_cents" numeric(15, 0) NOT NULL DEFAULT '0',
  "currency" varchar(3) NOT NULL DEFAULT 'CNY',
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "wallets_user_id_idx" ON "wallets"("user_id");

-- 投注类型表
CREATE TABLE IF NOT EXISTS "bet_types" (
  "id" serial PRIMARY KEY,
  "code" varchar(50) NOT NULL UNIQUE,
  "name" varchar(100) NOT NULL,
  "name_en" varchar(100),
  "category" "bet_type_category" NOT NULL,
  "description" text,
  "is_active" text DEFAULT 'true' NOT NULL,
  "sort_order" serial,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "bet_types_code_idx" ON "bet_types"("code");
CREATE INDEX IF NOT EXISTS "bet_types_category_idx" ON "bet_types"("category");

-- 比赛表
CREATE TABLE IF NOT EXISTS "matches" (
  "id" serial PRIMARY KEY,
  "team_home" varchar(100) NOT NULL,
  "team_away" varchar(100) NOT NULL,
  "team_home_code" varchar(3) NOT NULL,
  "team_away_code" varchar(3) NOT NULL,
  "team_home_flag_url" varchar(500),
  "team_away_flag_url" varchar(500),
  "score_home" smallint,
  "score_away" smallint,
  "half_score_home" smallint,
  "half_score_away" smallint,
  "status" "match_status" DEFAULT 'scheduled' NOT NULL,
  "stage" "match_stage" NOT NULL,
  "match_minute" smallint,
  "venue" varchar(255),
  "city" varchar(100),
  "country" varchar(100),
  "is_locked" boolean DEFAULT false NOT NULL,
  "settled_bets" integer DEFAULT 0 NOT NULL,
  "scheduled_at" timestamp with time zone NOT NULL,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "betting_closes_at" timestamp with time zone NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "matches_status_idx" ON "matches"("status");
CREATE INDEX IF NOT EXISTS "matches_stage_idx" ON "matches"("stage");
CREATE INDEX IF NOT EXISTS "matches_scheduled_at_idx" ON "matches"("scheduled_at");
CREATE INDEX IF NOT EXISTS "matches_betting_closes_at_idx" ON "matches"("betting_closes_at");

-- 赔率表
CREATE TABLE IF NOT EXISTS "odds" (
  "id" serial PRIMARY KEY,
  "match_id" integer NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "bet_type_id" integer NOT NULL REFERENCES "bet_types"("id") ON DELETE RESTRICT,
  "option" varchar(50) NOT NULL,
  "option_label" varchar(100) NOT NULL,
  "value" numeric(8, 4) NOT NULL,
  "handicap" numeric(5, 2),
  "line" numeric(5, 2),
  "status" "odds_status" DEFAULT 'active' NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "odds_match_id_idx" ON "odds"("match_id");
CREATE INDEX IF NOT EXISTS "odds_match_bet_type_idx" ON "odds"("match_id", "bet_type_id");
CREATE INDEX IF NOT EXISTS "odds_status_idx" ON "odds"("status");

-- 赔率变动历史表
CREATE TABLE IF NOT EXISTS "odds_history" (
  "id" serial PRIMARY KEY,
  "odds_id" integer NOT NULL REFERENCES "odds"("id") ON DELETE CASCADE,
  "old_value" numeric(8, 4) NOT NULL,
  "new_value" numeric(8, 4) NOT NULL,
  "changed_by" integer,
  "reason" varchar(255),
  "changed_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "odds_history_odds_id_idx" ON "odds_history"("odds_id");
CREATE INDEX IF NOT EXISTS "odds_history_changed_at_idx" ON "odds_history"("changed_at");

-- 投注表
CREATE TABLE IF NOT EXISTS "bets" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "match_id" integer NOT NULL REFERENCES "matches"("id") ON DELETE RESTRICT,
  "odds_id" integer NOT NULL REFERENCES "odds"("id") ON DELETE RESTRICT,
  "selection" varchar(50) NOT NULL,
  "amount_cents" numeric(15, 0) NOT NULL,
  "odds_snapshot" numeric(8, 4) NOT NULL,
  "potential_payout_cents" numeric(15, 0) NOT NULL,
  "actual_payout_cents" numeric(15, 0),
  "status" "bet_status" DEFAULT 'pending' NOT NULL,
  "idempotency_key" varchar(128) UNIQUE,
  "client_ip" varchar(45),
  "placed_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "settled_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "bets_user_id_idx" ON "bets"("user_id");
CREATE INDEX IF NOT EXISTS "bets_match_id_idx" ON "bets"("match_id");
CREATE INDEX IF NOT EXISTS "bets_status_idx" ON "bets"("status");
CREATE INDEX IF NOT EXISTS "bets_placed_at_idx" ON "bets"("placed_at");
CREATE INDEX IF NOT EXISTS "bets_user_status_idx" ON "bets"("user_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "bets_idempotency_key_idx" ON "bets"("idempotency_key");

-- 账户流水表
CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "type" "transaction_type" NOT NULL,
  "status" "transaction_status" DEFAULT 'completed' NOT NULL,
  "amount_cents" numeric(15, 0) NOT NULL,
  "balance_before_cents" numeric(15, 0) NOT NULL,
  "balance_after_cents" numeric(15, 0) NOT NULL,
  "wallet_id" integer REFERENCES "wallets"("id") ON DELETE CASCADE,
  "bet_id" integer REFERENCES "bets"("id") ON DELETE SET NULL,
  "external_order_id" varchar(128),
  "remark" text,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "transactions_user_id_idx" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "transactions_type_idx" ON "transactions"("type");
CREATE INDEX IF NOT EXISTS "transactions_status_idx" ON "transactions"("status");
CREATE INDEX IF NOT EXISTS "transactions_created_at_idx" ON "transactions"("created_at");
CREATE INDEX IF NOT EXISTS "transactions_user_type_idx" ON "transactions"("user_id", "type");
CREATE INDEX IF NOT EXISTS "transactions_external_order_idx" ON "transactions"("external_order_id");

-- 支付申请表
CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "direction" varchar(10) NOT NULL,
  "amount_cents" numeric(15, 0) NOT NULL,
  "status" "payment_status" DEFAULT 'pending' NOT NULL,
  "channel" varchar(50),
  "external_trade_no" varchar(128),
  "account_info" text,
  "admin_remark" text,
  "reviewed_by" integer,
  "reviewed_at" timestamp with time zone,
  "transaction_id" integer REFERENCES "transactions"("id") ON DELETE SET NULL,
  "expired_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "payments_user_id_idx" ON "payments"("user_id");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_direction_idx" ON "payments"("direction");
CREATE INDEX IF NOT EXISTS "payments_external_trade_no_idx" ON "payments"("external_trade_no");
CREATE INDEX IF NOT EXISTS "payments_created_at_idx" ON "payments"("created_at");

-- 结算记录表
CREATE TABLE IF NOT EXISTS "settlements" (
  "id" serial PRIMARY KEY,
  "match_id" integer NOT NULL UNIQUE REFERENCES "matches"("id") ON DELETE RESTRICT,
  "status" "settlement_status" DEFAULT 'pending' NOT NULL,
  "final_score_home" integer NOT NULL,
  "final_score_away" integer NOT NULL,
  "total_bets_count" integer DEFAULT 0 NOT NULL,
  "won_bets_count" integer DEFAULT 0 NOT NULL,
  "lost_bets_count" integer DEFAULT 0 NOT NULL,
  "void_bets_count" integer DEFAULT 0 NOT NULL,
  "total_stakes_cents" numeric(18, 0) DEFAULT '0' NOT NULL,
  "total_payout_cents" numeric(18, 0) DEFAULT '0' NOT NULL,
  "platform_profit_cents" numeric(18, 0) DEFAULT '0' NOT NULL,
  "settled_by" integer,
  "settlement_notes" text,
  "error_message" text,
  "settled_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "settlements_match_id_idx" ON "settlements"("match_id");
CREATE INDEX IF NOT EXISTS "settlements_status_idx" ON "settlements"("status");
CREATE INDEX IF NOT EXISTS "settlements_settled_at_idx" ON "settlements"("settled_at");


-- ============================================================
-- 3. 种子数据 - 投注类型
-- ============================================================

INSERT INTO "bet_types" ("code", "name", "name_en", "category", "description", "is_active", "sort_order")
VALUES
  ('result_1x2', '胜平负', 'Match Result (1X2)', 'result', '预测比赛最终结果：主胜(1)、平局(X)、客胜(2)', 'true', 1),
  ('handicap', '让球胜负', 'Asian Handicap', 'handicap', '给弱队让球，使赔率更均衡', 'true', 2),
  ('over_under', '大小球', 'Over/Under', 'over_under', '预测全场总进球数是否超过基准线', 'true', 3),
  ('exact_score', '波胆', 'Correct Score', 'exact_score', '预测比赛精确比分', 'true', 4),
  ('half_full', '半全场', 'Half Time / Full Time', 'half_full', '分别预测半场和全场胜负结果的组合', 'true', 5),
  ('both_score', '双方进球', 'Both Teams To Score', 'both_score', '预测两队是否都能进球', 'true', 6)
ON CONFLICT ("code") DO NOTHING;


-- ============================================================
-- 4. 种子数据 - 管理员账号
-- ============================================================

-- 密码: Admin@2026! (bcrypt hash)
INSERT INTO "users" ("username", "email", "password_hash", "role", "status", "balance_cents")
VALUES (
  'admin',
  'admin@worldcup.bet',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiWYMF0/W4Fe',
  'admin',
  'active',
  '0'
)
ON CONFLICT ("email") DO NOTHING;

-- 创建管理员钱包
INSERT INTO "wallets" ("user_id", "balance_cents", "frozen_cents")
SELECT id, '0', '0'
FROM "users"
WHERE email = 'admin@worldcup.bet'
ON CONFLICT ("user_id") DO NOTHING;


-- ============================================================
-- 5. 种子数据 - 示例比赛
-- ============================================================

INSERT INTO "matches" (
  "team_home", "team_away", "team_home_code", "team_away_code",
  "stage", "venue", "city", "country", "scheduled_at", "betting_closes_at"
)
VALUES
  ('巴西', '塞尔维亚', 'BRA', 'SRB', 'group_a', '墨西哥城阿兹特克球场', '墨西哥城', '墨西哥', '2026-06-11 20:00:00-06:00', '2026-06-11 19:00:00-06:00'),
  ('阿根廷', '澳大利亚', 'ARG', 'AUS', 'group_b', '洛杉矶玫瑰碗', '洛杉矶', '美国', '2026-06-12 19:00:00-07:00', '2026-06-12 18:00:00-07:00'),
  ('法国', '摩洛哥', 'FRA', 'MAR', 'group_c', '达拉斯AT&T球场', '达拉斯', '美国', '2026-06-13 19:00:00-05:00', '2026-06-13 18:00:00-05:00'),
  ('英格兰', '荷兰', 'ENG', 'NED', 'group_d', '温哥华BC广场', '温哥华', '加拿大', '2026-06-14 18:00:00-07:00', '2026-06-14 17:00:00-07:00'),
  ('西班牙', '德国', 'ESP', 'GER', 'group_e', '迈阿密硬石球场', '迈阿密', '美国', '2026-06-15 20:00:00-04:00', '2026-06-15 19:00:00-04:00')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 6. 种子数据 - 比赛赔率（胜平负）
-- =========================================================---

-- 为每场比赛创建胜平负赔率
DO $$
DECLARE
  match_record RECORD;
  bet_type_id integer;
BEGIN
  -- 获取胜平负投注类型 ID
  SELECT id INTO bet_type_id FROM "bet_types" WHERE code = 'result_1x2';

  -- 为每场比赛创建赔率
  FOR match_record IN SELECT id, "team_home", "team_away" FROM "matches"
  LOOP
    -- 检查赔率是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM "odds" WHERE "match_id" = match_record.id AND "bet_type_id" = bet_type_id
    ) THEN
      INSERT INTO "odds" ("match_id", "bet_type_id", "option", "option_label", "value")
      VALUES
        (match_record.id, bet_type_id, 'home', '主胜', '1.8500'),
        (match_record.id, bet_type_id, 'draw', '平局', '3.4000'),
        (match_record.id, bet_type_id, 'away', '客胜', '4.2000');
    END IF;
  END LOOP;
END $$;


-- ============================================================
-- 完成提示
-- ============================================================

SELECT '✅ 数据库迁移完成！' AS message;
SELECT '📋 管理员账号: admin@worldcup.bet / Admin@2026!' AS admin_login;
