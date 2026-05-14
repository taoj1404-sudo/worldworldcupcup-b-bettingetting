# WorldCup 竞猜平台 - 生产环境配置

## 环境变量配置

### 必须配置（生产环境）

```bash
# 数据库
DATABASE_URL="postgresql://user:password@host:5432/worldcup_betting"

# JWT（生产环境请使用强随机密钥，至少 32 字符）
JWT_SECRET="your-super-secret-jwt-key-at-least-32-characters"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-at-least-32-characters"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Next.js
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret"

# 可选：Redis（用于会话存储和实时功能）
REDIS_URL="redis://redis:6379"

# 环境
NODE_ENV="production"
```

### 开发环境

```bash
cp .env.example .env.local
# 编辑 .env.local，修改数据库连接信息
```

## Docker 部署

### 快速启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

### 手动构建

```bash
# 构建镜像
docker build -t worldcup-betting:latest .

# 运行容器
docker run -d \
  --name worldcup-betting \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  worldcup-betting:latest
```

## 生产环境检查清单

- [ ] 修改所有 `SECRET` 和 `KEY` 为强随机值
- [ ] 配置 HTTPS/SSL 证书
- [ ] 设置正确的 `NEXTAUTH_URL`（生产域名）
- [ ] 配置数据库连接池（建议 max=20）
- [ ] 配置 Redis（可选，用于 Socket.IO 扩展）
- [ ] 设置日志输出到文件或日志服务
- [ ] 配置备份策略
