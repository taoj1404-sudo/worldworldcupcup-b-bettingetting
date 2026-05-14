# 🏆 WorldCup 竞猜平台

一个完整的实时世界杯足球竞猜平台，支持用户注册登录、充值下注、实时赔率、排行榜等功能。

## ✨ 功能特性

- 🔐 **用户系统**: 注册、登录、JWT 认证、Token 自动刷新
- 💰 **钱包系统**: 充值、提现、余额管理、交易历史
- ⚽ **赛事系统**: 比赛列表、实时状态、完赛结果
- 📊 **赔率系统**: 多种投注选项、实时赔率更新
- 🎯 **下注系统**: 快捷下注、下注记录、盈亏统计
- 🏆 **排行榜**: 用户排名、胜率统计、收益展示
- 📡 **实时通知**: WebSocket 推送、赔率更新通知

## 🚀 快速开始

### 前置要求

- Node.js v18+
- PostgreSQL 16+
- Redis 7+（可选）

### 安装步骤

#### 方式一：使用本地数据库

1. **安装 PostgreSQL**
   - 下载地址: https://www.postgresql.org/download/
   - 默认用户名: `postgres`
   - 默认密码: `postgres`

2. **创建数据库**
   ```sql
   CREATE DATABASE worldcup_betting;
   ```

3. **安装依赖**
   ```bash
   cd worldcup-betting
   npm install
   ```

4. **配置环境变量**
   ```bash
   # 确保 .env 文件存在并包含以下内容：
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/worldcup_betting"
   ```

5. **运行数据库迁移**
   ```bash
   npm run db:push
   ```

6. **填充测试数据（可选）**
   ```bash
   npm run db:seed
   ```

7. **启动开发服务器**
   ```bash
   npm run dev
   ```

#### 方式二：使用 Docker（推荐）

1. 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

2. 运行启动脚本
   ```bash
   install-run-test.bat
   ```

或者手动启动：
   ```bash
   # 启动 PostgreSQL 和 Redis
   docker-compose up -d db redis

   # 安装依赖
   npm install

   # 运行迁移
   npm run db:push

   # 启动应用
   npm run dev
   ```

## 📁 项目结构

```
worldcup-betting/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── admin/         # 管理后台
│   │   ├── login/         # 登录页
│   │   └── register/      # 注册页
│   ├── components/        # React 组件
│   ├── db/               # 数据库相关
│   ├── lib/              # 工具函数
│   └── styles/           # 样式文件
├── public/              # 静态资源
├── test-*.js           # 测试脚本
└── docker-compose.yml  # Docker 配置
```

## 🧪 测试

### 运行所有测试

```bash
node test-all.js
```

### 分项测试

```bash
# 健康检查
node test-health.js

# 认证流程
node test-auth.js

# 综合功能
node test-all.js
```

### 测试清单

- ✅ 健康检查端点
- ✅ 用户注册
- ✅ 用户登录
- ✅ JWT Token 认证
- ✅ Token 刷新
- ✅ 获取用户信息
- ✅ 钱包余额查询
- ✅ 钱包历史记录
- ✅ 比赛列表查询
- ✅ 赔率查询
- ✅ 下注功能
- ✅ 排行榜

## 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 应用首页 | http://localhost:3000 |
| API 健康检查 | http://localhost:3000/api/health |
| 登录页 | http://localhost:3000/login |
| 注册页 | http://localhost:3000/register |
| 管理后台 | http://localhost:3000/admin |

## 🛠️ 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 生产构建
npm run start         # 启动生产服务器

# 数据库
npm run db:push      # 推送数据库变更
npm run db:seed      # 填充测试数据
npm run db:studio    # 打开数据库管理工具

# 代码质量
npm run lint         # ESLint 检查
```

## 📦 技术栈

- **前端**: React 19, Next.js 16, TailwindCSS 4
- **后端**: Node.js, Next.js API Routes
- **数据库**: PostgreSQL 16, Drizzle ORM
- **认证**: JWT (jose), bcryptjs
- **实时**: Socket.IO
- **部署**: Docker, Docker Compose

## 🔧 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接字符串 | postgresql://user:pass@host:5432/db |
| JWT_SECRET | JWT 签名密钥（至少32字符） | your-secret-key |
| JWT_REFRESH_SECRET | Refresh Token 密钥 | your-refresh-secret |
| REDIS_URL | Redis 连接字符串 | redis://localhost:6379 |
| NODE_ENV | 运行环境 | development/production |

## 🐛 故障排除

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否运行
netstat -ano | findstr ":5432"

# 检查连接字符串
cat .env | findstr DATABASE_URL
```

### 端口被占用

```bash
# 查找占用端口 3000 的进程
netstat -ano | findstr ":3000"

# 或使用其他端口
PORT=3001 npm run dev
```

### 依赖安装失败

```bash
# 清理并重新安装
rmdir /s /q node_modules
del package-lock.json
npm install
```

## 📄 许可证

MIT License

## 👨‍💻 作者

WorldCup Betting Platform Team
