# Vercel 部署指南 - WorldCup Betting

## 特点
- ✅ 免费
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ✅ 免备案
- ✅ 微信/QQ 可直接打开

## 部署步骤

### 1. 注册 Vercel
访问 https://vercel.com，用 GitHub/邮箱注册

### 2. 安装 Vercel CLI
```bash
npm install -g vercel
```

### 3. 部署
```bash
cd worldcup-betting
vercel
```

按提示操作：
- Set up and deploy? → **Y**
- Which scope? → 选择你的账号
- Link to existing project? → **N**（新建）
- Project name? → `worldcup-betting`
- Directory? → `./`
- Override settings? → **N**

### 4. 配置环境变量
在 Vercel Dashboard → 你的项目 → Settings → Environment Variables

添加以下变量：
```
DATABASE_URL = 你的 PostgreSQL 连接字符串
JWT_SECRET = 随机密钥
JWT_REFRESH_SECRET = 随机密钥
JWT_EXPIRES_IN = 15m
JWT_REFRESH_EXPIRES_IN = 7d
NEXTAUTH_URL = https://你的项目.vercel.app
NEXTAUTH_SECRET = 随机密钥
REDIS_URL = redis://你的-redis-url（可选）
```

### 5. 部署完成
获得一个免费的 `.vercel.app` 域名，例如：
```
https://worldcup-betting.vercel.app
```

### 6. 自定义域名（可选）
在 Vercel Dashboard → Domains 添加你自己的域名

---

## 数据库方案

Vercel 只有前端托管，需要单独的数据库。有两个免费方案：

### 方案 A：Neon（推荐，免费）
1. 注册 https://neon.tech
2. 创建 PostgreSQL 数据库
3. 复制连接字符串到 Vercel 环境变量

### 方案 B：Supabase（免费额度）
1. 注册 https://supabase.com
2. 创建 PostgreSQL 数据库
3. 复制连接字符串

---

## 部署命令汇总

```bash
# 1. 安装
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
cd worldcup-betting
vercel

# 4. 生产环境部署
vercel --prod
```

---

## 常见问题

**Q: Vercel 免费版有访问限制吗？**
A: 每月 100GB 带宽，个人使用足够。

**Q: 微信能打开吗？**
A: 只要域名没有被微信拦截就可以。`.vercel.app` 域名在国内有时可能被拦截，建议绑定自己的域名。

**Q: 数据库在国外，速度会慢吗？**
A: 选择香港/日本区域速度还行。如需更快，可用阿里云/腾讯云的海外节点数据库。
