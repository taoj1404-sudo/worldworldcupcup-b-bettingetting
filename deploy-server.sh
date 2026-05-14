#!/bin/bash
# ============================================================
# WorldCup Betting Platform - 服务器部署脚本
# 适用于 Ubuntu 22.04 LTS
# 使用方法：bash deploy-server.sh
# ============================================================

set -e  # 遇到错误立即退出

# ─── 颜色定义 ───────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── 配置变量 ───────────────────────────────────────────────
APP_NAME="worldcup-betting"
APP_DIR="/opt/${APP_NAME}"
APP_USER="deploy"
APP_PORT=3000
DOMAIN="your-domain.com"  # 修改为你的域名

# ─── 打印函数 ───────────────────────────────────────────────
print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# ─── 1. 系统更新 ────────────────────────────────────────────
print_step "1. 更新系统软件包"
apt update && apt upgrade -y

# ─── 2. 安装基础依赖 ────────────────────────────────────────
print_step "2. 安装基础依赖"

apt install -y \
    curl \
    wget \
    git \
    unzip \
    nginx \
    certbot \
    python3-certbot-nginx \
    build-essential \
    libpq-dev

print_success "基础依赖安装完成"

# ─── 3. 安装 Node.js 18 ────────────────────────────────────
print_step "3. 安装 Node.js 18"

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v
npm -v

print_success "Node.js 安装完成"

# ─── 4. 安装 PM2 进程管理器 ────────────────────────────────
print_step "4. 安装 PM2"

npm install -g pm2
pm2 install pm2-logrotate
pm2 startup

print_success "PM2 安装完成"

# ─── 5. 安装 PostgreSQL ────────────────────────────────────
print_step "5. 安装 PostgreSQL 16"

# 添加 PostgreSQL APT 仓库
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update

# 安装 PostgreSQL 16
apt install -y postgresql-16 postgresql-client-16

# 启动服务
systemctl enable postgresql
systemctl start postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
-- 创建数据库用户
CREATE USER ${APP_USER} WITH PASSWORD 'YourSecurePassword123!';

-- 创建数据库
CREATE DATABASE ${APP_NAME} OWNER ${APP_USER};

-- 授权
GRANT ALL PRIVILEGES ON DATABASE ${APP_NAME} TO ${APP_USER};

-- 允许用户创建扩展
ALTER USER ${APP_USER} CREATEDB;
EOF

print_success "PostgreSQL 安装完成"

# ─── 6. 安装 Redis ─────────────────────────────────────────
print_step "6. 安装 Redis"

apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 配置 Redis
cat > /etc/redis/redis.conf << 'EOF'
# 绑定到本地
bind 127.0.0.1
# 设置密码（可选）
# requirepass YourRedisPassword
# 持久化
appendonly yes
EOF

systemctl restart redis-server

print_success "Redis 安装完成"

# ─── 7. 创建应用用户 ───────────────────────────────────────
print_step "7. 创建应用用户"

# 创建用户（如果不存在）
if ! id -u ${APP_USER} > /dev/null 2>&1; then
    useradd -m -s /bin/bash ${APP_USER}
    print_success "用户 ${APP_USER} 创建完成"
else
    print_warning "用户 ${APP_USER} 已存在"
fi

# ─── 8. 创建应用目录 ───────────────────────────────────────
print_step "8. 创建应用目录"

mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/backups

# 权限设置
chown -R ${APP_USER}:${APP_USER} ${APP_DIR}

print_success "应用目录创建完成"

# ─── 9. 配置 Nginx ─────────────────────────────────────────
print_step "9. 配置 Nginx"

cat > /etc/nginx/sites-available/${APP_NAME} << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # 重定向到 HTTPS（稍后配置）
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件（可选，如果 Next.js 输出 standalone）
    # location /_next/static {
    #     proxy_pass http://127.0.0.1:${APP_PORT};
    #     proxy_cache_valid 200 60m;
    # }

    # 日志
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t

systemctl reload nginx

print_success "Nginx 配置完成"

# ─── 10. 配置防火墙 ────────────────────────────────────────
print_step "10. 配置防火墙"

ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

print_success "防火墙配置完成"

# ─── 11. SSL 证书（Let's Encrypt）──────────────────────────
print_step "11. 配置 SSL 证书"

print_warning "请确保域名 ${DOMAIN} 已解析到本服务器 IP"
read -p "是否现在配置 SSL 证书？(y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}
    # 自动续期
    crontab -l | grep certbot || echo "0 0 * * * certbot renew --quiet" | crontab -
    print_success "SSL 证书配置完成"
else
    print_warning "跳过 SSL 配置，稍后可手动运行: certbot --nginx -d ${DOMAIN}"
fi

# ─── 12. 创建部署脚本 ──────────────────────────────────────
print_step "12. 创建部署脚本"

cat > ${APP_DIR}/deploy.sh << 'DEPLOY_EOF'
#!/bin/bash
# 部署脚本 - 在本地运行后上传，或在服务器上直接运行

set -e

APP_NAME="worldcup-betting"
APP_DIR="/opt/${APP_NAME}"
BRANCH="main"

echo "🚀 开始部署 ${APP_NAME}..."

cd ${APP_DIR}

# 拉取最新代码
git pull origin ${BRANCH}

# 安装依赖
npm ci --production

# 构建
npm run build

# 重启应用
pm2 restart ${APP_NAME} || pm2 start npm --name ${APP_NAME} -- start

# 保存 PM2 进程列表
pm2 save

echo "✅ 部署完成！"
DEPLOY_EOF

chmod +x ${APP_DIR}/deploy.sh
chown ${APP_USER}:${APP_USER} ${APP_DIR}/deploy.sh

print_success "部署脚本创建完成"

# ─── 13. 创建环境变量文件 ──────────────────────────────────
print_step "13. 创建环境变量文件"

cat > ${APP_DIR}/.env.production << 'ENV_EOF'
# ─── 数据库 ──────────────────────────────────────────
DATABASE_URL="postgresql://deploy:YourSecurePassword123!@localhost:5432/worldcup_betting"

# ─── Next.js ─────────────────────────────────────────
NODE_ENV="production"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="生成一个32位以上的随机字符串"

# ─── JWT ─────────────────────────────────────────────
JWT_SECRET="生成一个32位以上的随机字符串"
JWT_REFRESH_SECRET="生成一个32位以上的随机字符串"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="30d"

# ─── Redis ───────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ─── 第三方 API（可选）───────────────────────────────
API_FOOTBALL_KEY=""
API_FOOTBALL_HOST="api-football-v1.p.rapidapi.com"
THE_ODDS_API_KEY=""
ENV_EOF

chmod 600 ${APP_DIR}/.env.production
chown ${APP_USER}:${APP_USER} ${APP_DIR}/.env.production

print_success "环境变量文件创建完成"
print_warning "请编辑 ${APP_DIR}/.env.production 填入真实的密钥"

# ─── 14. 启动应用 ──────────────────────────────────────────
print_step "14. 首次启动应用"

# 创建 PM2 生态系统配置
cat > ${APP_DIR}/ecosystem.config.js << 'PM2_EOF'
module.exports = {
  apps: [{
    name: 'worldcup-betting',
    script: 'npm',
    args: 'start',
    cwd: '/opt/worldcup-betting',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/worldcup-betting/logs/err.log',
    out_file: '/opt/worldcup-betting/logs/out.log',
    log_file: '/opt/worldcup-betting/logs/combined.log',
    time: true
  }]
};
PM2_EOF

# 启动应用
su - ${APP_USER} -c "cd ${APP_DIR} && pm2 start ecosystem.config.js --env production"

# 保存 PM2 状态
pm2 save

print_success "应用启动完成"

# ─── 15. 显示状态 ──────────────────────────────────────────
print_step "15. 部署完成！"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 部署成功！${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 应用地址: http://${DOMAIN}"
echo "📍 应用目录: ${APP_DIR}"
echo "📍 日志目录: ${APP_DIR}/logs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 常用命令:"
echo "   查看日志:    pm2 logs ${APP_NAME}"
echo "   重启应用:    pm2 restart ${APP_NAME}"
echo "   停止应用:    pm2 stop ${APP_NAME}"
echo "   查看状态:    pm2 status"
echo "   部署更新:    bash ${APP_DIR}/deploy.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  记得:"
echo "   1. 编辑 ${APP_DIR}/.env.production 填入真实密钥"
echo "   2. 在数据库执行迁移脚本"
echo ""
