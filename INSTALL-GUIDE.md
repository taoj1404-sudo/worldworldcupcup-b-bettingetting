# 📦 WorldCup 竞猜平台 - 完整安装指南

## 系统要求

- **操作系统**: Windows 10/11, macOS, Linux
- **Node.js**: v18 或更高版本
- **内存**: 至少 4GB RAM
- **磁盘**: 至少 500MB 可用空间

---

## 选项 1: Windows 本地安装

### 第一步：安装 PostgreSQL

#### 方法 A：直接安装（推荐）

1. 下载 PostgreSQL 16 for Windows
   - 地址: https://www.postgresql.org/download/windows/
   - 选择版本: PostgreSQL 16.x

2. 运行安装程序
   - 安装目录: `C:\Program Files\PostgreSQL\16`
   - 数据目录: `C:\Program Files\PostgreSQL\16\data`
   - 端口: `5432`（默认）

3. 设置密码
   - 用户名: `postgres`
   - 密码: `postgres`（或记住你设置的密码）

4. 安装组件
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4（可选，图形化管理工具）
   - ✅ Command Line Tools

5. 完成安装

#### 方法 B：使用 Chocolatey

```powershell
# 安装 Chocolatey（如果没有）
Set-ExecutionPolicy BypassRemoteSignedMachineScope -Scope CurrentUser
iwr https://chocolatey.org/install.ps1 -UseBasicParsing | iex

# 安装 PostgreSQL
choco install postgresql-16 -y
```

#### 方法 C：使用 winget

```powershell
winget install PostgreSQL.PostgreSQL.16
```

### 第二步：创建数据库

打开 PowerShell 或 pgAdmin：

```powershell
# 使用 psql 命令行
psql -U postgres -c "CREATE DATABASE worldcup_betting;"
```

或使用 pgAdmin：
1. 打开 pgAdmin 4
2. 连接服务器
3. 右键 "Databases" → "Create" → "Database"
4. 数据库名: `worldcup_betting`

### 第三步：安装 Node.js 依赖

```powershell
# 进入项目目录
cd c:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting

# 安装依赖
call npm install
```

### 第四步：配置环境变量

确保 `.env` 文件存在：

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/worldcup_betting"
```

### 第五步：运行数据库迁移

```powershell
npm run db:push
```

### 第六步：填充测试数据（可选）

```powershell
npm run db:seed
```

### 第七步：启动应用

```powershell
npm run dev
```

### 第八步：运行测试

打开新的命令行窗口：

```powershell
# 健康检查
node test-health.js

# 认证测试
node test-auth.js

# 综合测试
node test-all.js
```

---

## 选项 2: Docker 安装（推荐）

### 第一步：安装 Docker Desktop

1. 下载 Docker Desktop
   - 地址: https://www.docker.com/products/docker-desktop/

2. 安装并启动 Docker Desktop

3. 等待 Docker 运行（托盘图标显示鲸鱼）

### 第二步：运行一键启动脚本

```powershell
cd c:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting
docker-compose up -d
```

### 第三步：安装 Node.js 依赖

```powershell
npm install
npm run db:push
npm run dev
```

---

## 选项 3: 使用所有工具一键安装

运行我们创建的自动化脚本：

```powershell
cd c:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting
install-run-test.bat
```

这个脚本会：
1. ✅ 检查 Node.js 环境
2. ✅ 检查 PostgreSQL 状态
3. ✅ 安装 npm 依赖
4. ✅ 运行数据库迁移
5. ✅ 提供种子数据选项
6. ✅ 启动开发服务器

---

## 验证安装

### 检查服务状态

1. **PostgreSQL**
   ```powershell
   netstat -ano | findstr ":5432"
   ```
   如果有输出，说明 PostgreSQL 正在运行。

2. **Redis**（可选）
   ```powershell
   netstat -ano | findstr ":6379"
   ```

3. **应用**
   浏览器访问 http://localhost:3000

### 运行测试

```powershell
# 测试 API 健康检查
node test-health.js

# 测试完整功能
node test-all.js
```

预期输出：
```
🚀 WorldCup 竞猜平台 - 综合测试

📋 🏥 健康检查
✅ PASS
📋 ⚽ 获取比赛列表
✅ PASS
...
📊 测试报告:
   ✅ 通过: 10
   ❌ 失败: 0
   📈 总计: 10

🎉 所有测试通过！
```

---

## 常见问题

### Q1: PostgreSQL 安装失败

**症状**: 安装程序报错或卡住

**解决方案**:
1. 关闭杀毒软件
2. 以管理员身份运行安装程序
3. 检查是否有旧版本 PostgreSQL 残留
4. 使用 Docker 作为替代方案

### Q2: 数据库连接失败

**症状**: `npm run db:push` 报错

**解决方案**:
1. 确认 PostgreSQL 服务正在运行
2. 检查 `.env` 文件中的 `DATABASE_URL`
3. 验证用户名密码正确
4. 确认数据库已创建

```powershell
# 测试连接
psql -U postgres -d worldcup_betting -c "SELECT 1;"
```

### Q3: 端口被占用

**症状**: `Error: listen EADDRINUSE :::3000`

**解决方案**:
1. 查找并停止占用端口的进程
   ```powershell
   netstat -ano | findstr ":3000"
   ```
2. 或使用其他端口
   ```powershell
   set PORT=3001 && npm run dev
   ```

### Q4: npm install 失败

**症状**: 安装依赖时报错

**解决方案**:
1. 清理缓存
   ```powershell
   npm cache clean --force
   ```
2. 删除 node_modules 和 package-lock.json
   ```powershell
   rmdir /s /q node_modules
   del package-lock.json
   ```
3. 重新安装
   ```powershell
   npm install
   ```

### Q5: 测试脚本连接失败

**症状**: `test-*.js` 报错 `ECONNREFUSED`

**解决方案**:
1. 确认开发服务器正在运行
   ```powershell
   npm run dev
   ```
2. 等待看到 `Ready - started server on http://localhost:3000`
3. 再运行测试脚本

---

## 技术支持

如果遇到其他问题：

1. 查看 `docs/` 目录下的文档
2. 检查 GitHub Issues
3. 查看项目 Wiki

---

## 下一步

安装成功后，你可以：

1. 🌐 访问 http://localhost:3000 查看应用
2. 🔐 注册新用户
3. 💰 测试充值功能
4. ⚽ 查看比赛列表
5. 🎯 测试下注功能
6. 🏆 查看排行榜
