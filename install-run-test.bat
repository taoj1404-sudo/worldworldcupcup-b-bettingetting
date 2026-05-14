@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════════════╗
echo ║        WorldCup 竞猜平台 - 安装 & 运行 & 测试                   ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:: 检查 Node.js
echo [1/6] 检查 Node.js...
node -v
if errorlevel 1 (
    echo ❌ Node.js 未安装，请先安装 Node.js v18+
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

:: 检查 npm
echo.
echo [2/6] 检查 npm...
npm -v
if errorlevel 1 (
    echo ❌ npm 未安装
    pause
    exit /b 1
)
echo ✅ npm 已安装

:: 检查 PostgreSQL
echo.
echo [3/6] 检查 PostgreSQL...
netstat -ano | findstr ":5432" >nul
if errorlevel 1 (
    echo ⚠️  PostgreSQL 未运行！
    echo.
    echo 请选择以下选项之一：
    echo   1. 安装 PostgreSQL 并创建数据库
    echo   2. 使用 Docker 运行 PostgreSQL
    echo   3. 跳过数据库测试（仅测试前端）
    echo.
    set /p choice="请输入选择 (1/2/3): "
    
    if "%choice%"=="1" (
        echo.
        echo 请从 https://www.postgresql.org/download/ 下载安装 PostgreSQL
        echo 安装时请记住用户名和密码，默认是 postgres/postgres
        echo.
        echo 创建数据库命令：
        echo   psql -U postgres -c "CREATE DATABASE worldcup_betting;"
        pause
    ) else if "%choice%"=="2" (
        echo.
        echo 请安装 Docker Desktop: https://www.docker.com/products/docker-desktop/
        echo 然后运行：
        echo   docker run --name worldcup-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=worldcup_betting -p 5432:5432 -d postgres:16
        pause
    ) else (
        echo ⚠️  跳过数据库测试
        set SKIP_DB=1
    )
)

:: 进入项目目录
echo.
echo [4/6] 进入项目目录并安装依赖...
cd /d "%~dp0worldcup-betting"

:: 安装 npm 依赖
echo.
echo 正在安装 npm 依赖（这可能需要几分钟）...
call npm install
if errorlevel 1 (
    echo ❌ npm install 失败
    pause
    exit /b 1
)
echo ✅ npm 依赖安装完成

:: 检查数据库连接并运行迁移
if not defined SKIP_DB (
    echo.
    echo [5/6] 运行数据库迁移...
    call npm run db:push
    if errorlevel 1 (
        echo ⚠️  数据库迁移失败，可能需要检查 PostgreSQL 连接
        echo 确认 DATABASE_URL 在 .env 文件中正确配置
    ) else (
        echo ✅ 数据库迁移完成
    )
    
    :: 运行种子数据（可选）
    echo.
    echo 是否要填充测试数据？
    set /p seed="输入 y 运行种子数据，其他跳过: "
    if /i "%seed%"=="y" (
        call npm run db:seed
        if errorlevel 1 (
            echo ⚠️  种子数据填充失败
        ) else (
            echo ✅ 测试数据填充完成
        )
    )
) else (
    echo.
    echo [5/6] 跳过数据库设置（SKIP_DB=1）
)

:: 启动开发服务器
echo.
echo [6/6] 启动开发服务器...
echo.
echo ═════════════════════════════════════════════════════════════════
echo   🌐 访问地址: http://localhost:3000
echo   📝 API 文档: http://localhost:3000/api-docs
echo   🏥 健康检查: http://localhost:3000/api/health
echo
echo   按 Ctrl+C 停止服务器
echo ═════════════════════════════════════════════════════════════════
echo.

:: 启动 Next.js 开发服务器
call npm run dev

pause
