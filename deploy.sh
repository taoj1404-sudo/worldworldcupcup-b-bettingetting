#!/bin/bash
# ============================================================
# WorldCup Betting Platform - 一键部署脚本
# 在本地运行，自动部署到服务器
# ============================================================

set -e

# ─── 配置 ──────────────────────────────────────────────────
SERVER_IP="your-server-ip"          # 修改为你的服务器 IP
SERVER_USER="deploy"                 # 服务器用户名
SSH_KEY="$HOME/.ssh/id_rsa"         # SSH 密钥路径
APP_DIR="/opt/worldcup-betting"      # 服务器应用目录

# ─── 颜色 ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 WorldCup Betting 一键部署${NC}\n"

# ─── 检查配置 ──────────────────────────────────────────────
echo "请确认以下配置："
echo "  服务器 IP: $SERVER_IP"
echo "  用户名: $SERVER_USER"
echo "  应用目录: $APP_DIR"
echo ""

read -p "配置正确吗？(y/n): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请编辑脚本修改配置"
    exit 1
fi

# ─── 测试 SSH 连接 ─────────────────────────────────────────
echo -e "\n${YELLOW}测试 SSH 连接...${NC}"
ssh -i "$SSH_KEY" -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_IP} "echo 'SSH 连接成功'" || {
    echo -e "${RED}SSH 连接失败，请检查配置${NC}"
    exit 1
}

# ─── 打包项目 ──────────────────────────────────────────────
echo -e "\n${YELLOW}打包项目文件...${NC}"

# 创建临时打包目录
TEMP_DIR="/tmp/worldcup-deploy-$(date +%s)"
mkdir -p "$TEMP_DIR"

# 复制项目文件（排除 node_modules 和不需要的文件）
rsync -av \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next' \
    --exclude='*.log' \
    --exclude='.env.local' \
    --exclude='.env.development' \
    --exclude='coverage' \
    --exclude='.DS_Store' \
    ./ "$TEMP_DIR/worldcup-betting/"

# 打包
cd "$TEMP_DIR"
tar -czf "../worldcup-betting.tar.gz" worldcup-betting/
cd -

# ─── 上传并部署 ────────────────────────────────────────────
echo -e "\n${YELLOW}上传到服务器...${NC}"

# 上传压缩包
scp -i "$SSH_KEY" /tmp/worldcup-betting.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/

# 在服务器上解压和部署
ssh -i "$SSH_KEY" ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
    set -e

    echo "解压文件..."
    tar -xzf /tmp/worldcup-betting.tar.gz -C /opt/

    echo "安装依赖..."
    cd /opt/worldcup-betting
    npm ci --production

    echo "构建项目..."
    npm run build

    echo "重启应用..."
    pm2 restart worldcup-betting || pm2 start ecosystem.config.js --env production

    echo "保存 PM2 状态..."
    pm2 save

    echo "清理临时文件..."
    rm -f /tmp/worldcup-betting.tar.gz

    echo "✅ 部署完成！"
ENDSSH

# ─── 清理本地临时文件 ──────────────────────────────────────
echo -e "\n${YELLOW}清理本地临时文件...${NC}"
rm -rf "$TEMP_DIR"
rm -f /tmp/worldcup-betting.tar.gz

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "访问你的应用检查是否正常运行"
echo ""
