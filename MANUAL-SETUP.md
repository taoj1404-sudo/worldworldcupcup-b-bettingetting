# 🎯 WorldCup 竞猜平台 - 安装完成！

## ✅ 已完成

1. ✅ PostgreSQL 16 已安装
2. ✅ npm 依赖已安装（416 个包）
3. ✅ 所有代码文件已创建

## ⏳ 待完成（需要你手动操作）

### 步骤 1：创建数据库

打开 **PowerShell** 或 **命令提示符**，运行：

```powershell
cd C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting

"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres worldcup_betting
```

⚠️ 如果提示输入密码，默认密码是 `postgres`

### 步骤 2：运行数据库迁移

```powershell
npm run db:push
```

### 步骤 3：填充测试数据（可选）

```powershell
npm run db:seed
```

### 步骤 4：启动开发服务器

```powershell
npm run dev
```

### 步骤 5：运行测试

打开**新的** PowerShell 窗口：

```powershell
cd C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting
node test-all.js
```

---

## 🌐 访问地址

| 页面 | 地址 |
|------|------|
| 应用首页 | http://localhost:3000 |
| 健康检查 | http://localhost:3000/api/health |
| 登录页 | http://localhost:3000/login |
| 注册页 | http://localhost:3000/register |

---

## 🐛 故障排除

### 密码错误

如果 `createdb` 命令失败，可能需要设置密码：

```powershell
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

在 psql 提示符下输入：
```sql
ALTER USER postgres WITH PASSWORD 'your_new_password';
```

然后更新 `.env` 文件：
```
DATABASE_URL="postgresql://postgres:your_new_password@localhost:5432/worldcup_betting"
```

### 数据库迁移失败

确保：
1. PostgreSQL 服务正在运行
2. 数据库已创建
3. 用户名密码正确

---

## 📝 一键脚本

项目目录中提供了以下脚本：

| 脚本 | 用途 |
|------|------|
| `quick-setup.bat` | 快速安装（创建数据库 + 迁移） |
| `install-postgres.bat` | 安装 PostgreSQL |
| `install-run-test.bat` | 完整安装 + 运行测试 |
| `test-*.js` | 各种测试脚本 |

---

## 🎉 成功标志

当看到以下输出时，表示一切正常：

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

**有问题随时问我！**
