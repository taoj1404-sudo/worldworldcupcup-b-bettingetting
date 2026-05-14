# WorldCup Betting - 生产环境部署指南

## 目录
1. [云服务器部署](#1-云服务器部署)
2. [域名配置](#2-域名配置)
3. [SSL 证书申请](#3-ssl-证书申请)
4. [Nginx 反向代理](#4-nginx-反向代理)
5. [社交分享配置](#5-社交分享配置)
6. [启动顺序](#6-启动顺序)

---

## 1. 云服务器部署

### 服务器要求
- **系统**: Ubuntu 20.04+ / CentOS 7+
- **配置**: 2核 2GB 内存（最低）
- **环境**: Docker + Docker Compose

### 一键部署应用
```bash
# 上传项目后运行
cd /opt/worldcup-betting
bash deploy.sh
```

---

## 2. 域名配置

### 购买域名
推荐：阿里云、腾讯云、Cloudflare

### DNS 解析
添加 A 记录指向服务器 IP：
```
记录类型: A
主机记录: @ (或 www)
记录值: 你的服务器IP
```

### 修改 Nginx 配置
编辑 `nginx.conf`，将 `your-domain.com` 替换为你的域名：
```bash
sed -i 's/your-domain.com/你的域名/g' /etc/nginx/sites-available/worldcup-betting
```

---

## 3. SSL 证书申请

### 自动申请（推荐）
```bash
cd /opt/worldcup-betting
bash setup-ssl.sh your-domain.com admin@your-domain.com
```

### 手动申请
```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx

# 停止 nginx
systemctl stop nginx

# 申请证书
certbot certonly --standalone -d your-domain.com --non-interactive --agree-tos -m admin@your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 自动续期
证书有效期 90 天，系统会自动续期。

---

## 4. Nginx 反向代理

### 安装 Nginx
```bash
# Ubuntu/Debian
apt-get install -y nginx

# CentOS
yum install -y nginx
```

### 配置站点
```bash
# 复制配置
cp /opt/worldcup-betting/nginx.conf /etc/nginx/sites-available/worldcup-betting

# 启用站点
ln -sf /etc/nginx/sites-available/worldcup-betting /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

### 开放防火墙
```bash
# Ubuntu/Debian (ufw)
ufw allow 80/tcp
ufw allow 443/tcp

# CentOS (firewalld)
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

---

## 5. 社交分享配置

### 部署 OG 图片
```bash
# 将 SVG 转换为 PNG（可选，更好的兼容性）
# 或直接使用 public/og-image.svg

# 上传到服务器
cp /opt/worldcup-betting/public/og-image.svg /var/www/html/
```

### 配置环境变量
```bash
# 在 .env 中添加
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### 分享测试
- **微信**: 需要已备案域名（国内服务器）
- **QQ**: https://qm.qq.com/cgi-bin/qm/qr?k=...
- **Twitter**: https://cards.twitter.com/validator
- **Facebook**: https://developers.facebook.com/tools/debug/

---

## 6. 启动顺序

```bash
# 1. 启动 Docker 服务
systemctl start docker

# 2. 启动应用
cd /opt/worldcup-betting
docker-compose up -d

# 3. 申请 SSL 证书
bash setup-ssl.sh your-domain.com admin@your-domain.com

# 4. 配置并启动 Nginx
cp nginx.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 5. 开放防火墙
ufw allow 80/tcp
ufw allow 443/tcp
```

---

## 访问地址

部署完成后，访问：
```
https://your-domain.com
```

管理后台：
```
https://your-domain.com/admin
```

---

## 常见问题

### 1. 证书申请失败
- 检查域名 DNS 是否正确解析
- 确保 80 端口未被占用
- 检查防火墙是否开放 80 端口

### 2. 微信打不开
- 微信需要域名已备案（国内服务器）
- 或使用香港/海外服务器

### 3. 502 Bad Gateway
- 检查 Docker 容器是否运行: `docker-compose ps`
- 检查应用日志: `docker-compose logs app`

### 4. HTTPS 不安全
- 确认证书路径正确
- 运行 `certbot certificates` 查看证书状态
