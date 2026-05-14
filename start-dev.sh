#!/bin/bash
# WorldCup 竞猜平台 - 本地开发启动脚本
# 使用 Docker Compose 启动 PostgreSQL 数据库

set -e

echo "🏆 WorldCup 竞猜平台 - 开发环境启动"
echo "=================================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker 服务未运行，请启动 Docker"
    exit 1
fi

echo "✅ Docker 已就绪"

# 启动数据库服务
echo ""
echo "📦 启动 PostgreSQL 数据库..."
docker-compose up -d db redis

# 等待数据库就绪
echo "⏳ 等待数据库启动..."
sleep 5

# 检查数据库健康状态
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U worldcup -d worldcup_betting &> /dev/null; then
        echo "✅ PostgreSQL 已就绪"
        break
    fi
    echo "⏳ 等待中... ($i/30)"
    sleep 2
done

# 安装依赖
echo ""
echo "📦 安装 Node.js 依赖..."
npm install

# 推送数据库 schema
echo ""
echo "🗄️  推送数据库 Schema..."
npm run db:push

# 初始化数据
echo ""
echo "🌱 初始化种子数据..."
npm run db:seed

# 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo ""
echo "📝 访问地址:"
echo "   前端: http://localhost:3000"
echo "   数据库: localhost:5432"
echo "   Redis: localhost:6379"
echo ""
echo "🔐 管理员账户:"
echo "   Email: admin@worldcup.bet"
echo "   Password: Admin@2026"
echo ""
echo "=================================="

npm run dev
