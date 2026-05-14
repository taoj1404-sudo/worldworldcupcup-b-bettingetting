# 🐳 Docker 快速启动指南

如果你的系统没有安装 PostgreSQL，可以使用 Docker 来运行数据库服务。

## 前置要求

1. 安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. 启动 Docker Desktop

## 快速启动

### 1. 启动 PostgreSQL 和 Redis

```bash
# 启动 PostgreSQL
docker run --name worldcup-postgres ^
  -e POSTGRES_USER=postgres ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=worldcup_betting ^
  -p 5432:5432 ^
  -v postgres_data:/var/lib/postgresql/data ^
  -d postgres:16

# 启动 Redis（可选，用于 Socket.IO）
docker run --name worldcup-redis ^
  -p 6379:6379 ^
  -v redis_data:/data ^
  -d redis:7-alpine
```

### 2. 验证服务运行

```bash
# 检查 PostgreSQL
docker ps | findstr worldcup-postgres

# 检查 Redis
docker ps | findstr worldcup-redis
```

### 3. 安装依赖并启动应用

```bash
# 进入项目目录
cd worldcup-betting

# 安装依赖
call npm install

# 运行数据库迁移
call npm run db:push

# 填充测试数据（可选）
call npm run db:seed

# 启动开发服务器
call npm run dev
```

### 4. 运行测试

```bash
# 健康检查
node test-health.js

# 认证测试
node test-auth.js

# 综合测试
node test-all.js
```

## Docker Compose（推荐方式）

使用 `docker-compose.yml` 一键启动所有服务：

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止所有服务
docker-compose down

# 重新构建并启动
docker-compose up --build -d
```

## 常用命令

```bash
# 停止并删除容器
docker stop worldcup-postgres worldcup-redis
docker rm worldcup-postgres worldcup-redis

# 查看日志
docker logs worldcup-postgres

# 进入 PostgreSQL 容器
docker exec -it worldcup-postgres psql -U postgres -d worldcup_betting

# 进入 Redis 容器
docker exec -it worldcup-redis redis-cli
```

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存（可选） |
| Next.js | 3000 | 应用 |

## 故障排除

### PostgreSQL 连接失败

```bash
# 检查容器是否运行
docker ps

# 重启容器
docker restart worldcup-postgres

# 查看日志
docker logs worldcup-postgres
```

### 端口被占用

```bash
# 查找占用端口的进程
netstat -ano | findstr ":5432"

# 或者更改端口映射
docker run -p 5433:5432 ...
```
