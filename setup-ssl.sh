#!/bin/bash
# ==============================================
# SSL 证书自动申请脚本（Let's Encrypt）
# ==============================================
# 使用 certbot 自动申请并续期 SSL 证书

set -e

DOMAIN=${1:-"your-domain.com"}
EMAIL=${2:-"admin@your-domain.com"}

echo "=== SSL 证书配置 ==="
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"

# 1. 安装 certbot
echo "[1/4] 安装 certbot..."
if command -v certbot &> /dev/null; then
    echo "certbot 已安装"
else
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot python3-certbot-nginx
    # CentOS/RHEL
    elif command -v yum &> /dev/null; then
        yum install -y certbot python3-certbot-nginx
    fi
fi

# 2. 停止 Nginx（申请证书需要）
echo "[2/4] 停止 Nginx..."
systemctl stop nginx || true

# 3. 申请证书
echo "[3/4] 申请 SSL 证书..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --http-01-port 80 \
    --keep-until-expiring

# 4. 配置自动续期
echo "[4/4] 配置自动续期..."
echo "0 0,12 * * * root certbot renew --quiet --deploy-hook 'systemctl reload nginx'" >> /etc/crontab
echo "已添加定时任务：每天 0:00 和 12:00 检查续期"

echo ""
echo "=== SSL 证书配置完成 ==="
echo "证书位置: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "后续步骤:"
echo "1. 编辑 nginx.conf，将 your-domain.com 替换为 $DOMAIN"
echo "2. 运行: cp nginx.conf /etc/nginx/sites-available/worldcup-betting"
echo "3. ln -sf /etc/nginx/sites-available/worldcup-betting /etc/nginx/sites-enabled/"
echo "4. systemctl restart nginx"
