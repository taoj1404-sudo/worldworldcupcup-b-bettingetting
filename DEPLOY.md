# 🚀 Vercel + Supabase 部署指南

## 环境变量配置

在 Vercel Dashboard → Project Settings → Environment Variables 中添加以下变量：

### 必需变量

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://postgres:DYX080317LE%40@db.dehtwxvnjxferniijifv.supabase.co:5432/postgres` | Supabase 数据库连接字符串（注意：`@` 要编码为 `%40`） |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dehtwxvnjxferniijifv.supabase.co` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_KcSZTG-E2pPcMlsNvKIu8Q_rf6N2fQ1` | Supabase 匿名密钥 |
| `NEXTAUTH_SECRET` | 随机字符串（至少32字符） | NextAuth 密钥 |
| `JWT_SECRET` | 随机字符串（至少32字符） | JWT 签名密钥 |
| `JWT_REFRESH_SECRET` | 随机字符串（至少32字符） | JWT 刷新密钥 |

### 可选变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `REDIS_URL` | - | Redis 连接字符串（可选） |
| `API_FOOTBALL_KEY` | - | RapidAPI 足球数据密钥 |
| `THE_ODDS_API_KEY` | - | 赔率 API 密钥 |

## 数据库迁移

部署后需要在 Supabase SQL Editor 中执行数据库迁移：

```bash
# 本地生成迁移 SQL
npm run db:generate

# 或者直接在 Supabase SQL Editor 中执行 schema.sql
```

## 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add Supabase + Vercel config"
   git push
   ```

2. **在 Vercel 导入项目**
   - 访问 https://vercel.com/new
   - 选择 GitHub 仓库
   - 配置环境变量（见上方表格）
   - 点击 Deploy

3. **配置数据库**
   - 在 Supabase SQL Editor 中执行 `schema.sql`
   - 添加种子数据

## 注意事项

- 本地开发继续使用 `npm run dev`（连接本地 PostgreSQL）
- 生产环境自动使用 Supabase（通过 `DATABASE_URL`）
- `@` 符号在 URL 中需要编码为 `%40`
