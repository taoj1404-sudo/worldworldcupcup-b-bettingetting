@echo off
chcp 65001 >nul
REM WorldCup 竞猜平台 - Windows 开发启动脚本

echo.
echo ==================================
echo  🏆 WorldCup 竞猜平台 - 开发环境启动
echo ==================================
echo.

REM 检查 Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 服务未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo ✅ Docker 已就绪

echo.
echo 📦 启动 PostgreSQL 和 Redis...
docker-compose up -d db redis

echo.
echo ⏳ 等待数据库启动...
timeout /t 5 /nobreak >nul

REM 等待数据库就绪
echo ⏳ 检查数据库状态...
for /L %%i in (1,1,30) do (
    docker-compose exec -T db pg_isready -U worldcup -d worldcup_betting >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ PostgreSQL 已就绪
        goto :db_ready
    )
    echo ⏳ 等待中... (%%i/30)
    timeout /t 2 /nobreak >nul
)

:db_ready
echo.
echo 📦 安装 Node.js 依赖...
call npm install

echo.
echo 🗄️ 推送数据库 Schema...
call npm run db:push

echo.
echo 🌱 初始化种子数据...
call npm run db:seed

echo.
echo ==================================
echo 📝 访问地址:
echo    前端: http://localhost:3000
echo    数据库: localhost:5432
echo    Redis: localhost:6379
echo.
echo 🔐 管理员账户:
echo    Email: admin@worldcup.bet
echo    Password: Admin@2026
echo ==================================
echo.
echo 🚀 启动开发服务器...
echo.

npm run dev

pause
