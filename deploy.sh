#!/bin/bash
# ==============================================
# WorldCup Betting Platform - 完整部署脚本
# 适用于 Ubuntu 20.04+ / CentOS 7+
# 包含: Docker + Nginx + SSL + 社交分享
# ==============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 世界杯竞猜平台 - 完整部署脚本 ===${NC}"

# 交互式获取域名
read -p "请输入你的域名（如 example.com）: " DOMAIN
read -p "请输入管理员邮箱（用于 SSL 证书）: " EMAIL

# 1. 检查环境
echo -e "${YELLOW}[1/8] 检查运行环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker 未安装，正在安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo "安装 docker-compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓ Docker $(docker --version | cut -d' ' -f3)${NC}"
echo -e "${GREEN}✓ Docker Compose $(docker-compose --version | cut -d' ' -f4)${NC}"

# 2. 安装 Nginx 和 Certbot
echo -e "${YELLOW}[2/8] 安装 Nginx 和 SSL 工具...${NC}"
if command -v apt-get &> /dev/null; then
    apt-get update
    apt-get install -y nginx certbot python3-certbot-nginx curl
elif command -v yum &> /dev/null; then
    yum install -y nginx certbot python3-certbot-nginx curl
fi
echo -e "${GREEN}✓ Nginx 和 Certbot 已安装${NC}"

# 3. 启动 Docker 服务
echo -e "${YELLOW}[3/8] 启动 Docker 服务...${NC}"
systemctl start docker
systemctl enable docker
echo -e "${GREEN}✓ Docker 服务已启动${NC}"

# 4. 配置项目目录
echo -e "${YELLOW}[4/8] 配置项目目录...${NC}"
mkdir -p /opt/worldcup-betting
cd /opt/worldcup-betting

if [ ! -f "package.json" ]; then
    echo -e "${RED}⚠️ 请先将项目文件上传到 /opt/worldcup-betting${NC}"
    exit 1
fi

# 5. 配置环境变量
echo -e "${YELLOW}[5/8] 配置环境变量...${NC}"
if [ ! -f ".env" ]; then
    # 生成随机密钥
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32)

    cat > .env << EOF
# 数据库
DATABASE_URL=postgresql://worldcup:worldcup_secure_$(date +%s)@db:5432/worldcup_betting

# JWT 认证密钥
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# 应用配置
NODE_ENV=production
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET

# 网站地址（用于社交分享）
NEXT_PUBLIC_SITE_URL=https://$DOMAIN

# Redis
REDIS_URL=redis://redis:6379

# 数据同步（可选）
# API_FOOTBALL_KEY=your_api_key
# THE_ODDS_API_KEY=your_api_key
EOF
    echo -e "${GREEN}✓ .env 文件已创建${NC}"
fi

# 6. 构建并启动 Docker
echo -e "${YELLOW}[6/8] 构建并启动 Docker 服务...${NC}"
docker-compose build
docker-compose up -d
echo -e "${GREEN}✓ Docker 服务已启动${NC}"

# 等待服务就绪
echo "等待服务启动..."
for i in {1..30}; do
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 应用服务已就绪${NC}"
        break
    fi
    echo "  等待中... ($i/30)"
    sleep 2
done

# 7. 配置 Nginx
echo -e "${YELLOW}[7/8] 配置 Nginx 反向代理...${NC}"

# 创建静态文件目录
mkdir -p /var/www/html
cp public/og-image.svg /var/www/html/ 2>/dev/null || true

# 复制并配置 Nginx
sed "s/your-domain.com/$DOMAIN/g" nginx.conf > /tmp/nginx-${DOMAIN}.conf
cp /tmp/nginx-${DOMAIN}.conf /etc/nginx/sites-available/worldcup-betting
ln -sf /etc/nginx/sites-available/worldcup-betting /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# 测试并启动 Nginx
nginx -t && systemctl enable nginx && systemctl start nginx
echo -e "${GREEN}✓ Nginx 已启动${NC}"

# 8. 申请 SSL 证书
echo -e "${YELLOW}[8/8] 申请 SSL 证书...${NC}"
systemctl stop nginx
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --http-01-port 80 \
    --keep-until-expiring || {
    echo -e "${YELLOW}⚠️ SSL 证书申请可能失败，请稍后手动运行:${NC}"
    echo "  bash setup-ssl.sh $DOMAIN $EMAIL"
}
systemctl start nginx

# 配置自动续期
echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" >> /etc/crontab
echo -e "${GREEN}✓ SSL 自动续期已配置${NC}"

# 开放防火墙
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw reload
fi

# 完成
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}      部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "访问地址: ${YELLOW}https://$DOMAIN${NC}"
echo -e "管理后台: ${YELLOW}https://$DOMAIN/admin${NC}"
echo ""
echo -e "${GREEN}管理员账号:${NC} admin@worldcup.bet"
echo -e "${GREEN}管理员密码:${NC} Admin@2026!"
echo ""
echo -e "常用命令:"
echo "  查看日志: docker-compose logs -f app"
echo "  查看 Nginx 日志: tail -f /var/log/nginx/worldcup_access.log"
echo "  重启应用: docker-compose restart"
echo "  更新部署: git pull && docker-compose build && docker-compose up -d"
echo ""
echo -e "${YELLOW}注意事项:${NC}"
echo "  1. 请及时修改管理员密码"
echo "  2. 微信分享需要域名已备案"
echo "  3. 定期备份数据库: docker-compose exec db pg_dump -U worldcup worldcup_betting > backup.sql"
