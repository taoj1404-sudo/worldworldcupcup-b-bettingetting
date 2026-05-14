@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║      WorldCup 竞猜平台 - 一键安装 & 启动                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
set "PROJECT_DIR=%SCRIPT_DIR%"

echo [1/5] 检查 Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js 未安装
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

echo.
echo [2/5] 检查 PostgreSQL...
sc query postgresql-x64-16 | findstr "STATE" | findstr "RUNNING" >nul
if errorlevel 1 (
    echo ⚠️ PostgreSQL 服务未运行，尝试启动...
    net start postgresql-x64-16 >nul 2>&1
    timeout /t 2 >nul
)
echo ✅ PostgreSQL 已就绪

echo.
echo [3/5] 创建数据库...
"%ProgramFiles%\PostgreSQL\16\bin\createdb.exe" -U postgres worldcup_betting >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 数据库可能已存在
) else (
    echo ✅ 数据库创建成功
)

echo.
echo [4/5] 安装依赖...
cd /d "%PROJECT_DIR%"
call npm install >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 依赖可能已安装
) else (
    echo ✅ 依赖安装完成
)

echo.
echo [5/5] 运行数据库迁移...
call npm run db:push >nul 2>&1
if errorlevel 1 (
    echo ⚠️ 数据库迁移失败
    echo 请检查 PostgreSQL 配置
    echo.
    echo 如果是密码问题，请修改 .env 文件中的 DATABASE_URL
    echo 或运行: "%ProgramFiles%\PostgreSQL\16\bin\psql.exe" -U postgres
    echo 然后输入: ALTER USER postgres WITH PASSWORD 'postgres';
) else (
    echo ✅ 数据库迁移完成
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo ✅ 安装完成！
echo.
echo 正在启动开发服务器...
echo.
echo 🌐 访问地址: http://localhost:3000
echo 📝 测试脚本: node test-all.js
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ═══════════════════════════════════════════════════════════════
echo.

:: 启动开发服务器
npm run dev

pause
