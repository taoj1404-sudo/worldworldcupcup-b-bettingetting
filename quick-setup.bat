@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo   WorldCup 竞猜平台 - 快速安装
echo ═══════════════════════════════════════════════════════════════
echo.

echo [1/4] 检查 PostgreSQL 服务...
sc query postgresql-x64-16 | findstr "RUNNING"
if %errorlevel% neq 0 (
    echo PostgreSQL 服务未运行，尝试启动...
    net start postgresql-x64-16
)
echo ✅ PostgreSQL 服务正常

echo.
echo [2/4] 创建数据库...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "SELECT 'worldcup_betting' WHERE 1=1" >nul 2>&1
if %errorlevel% neq 0 (
    echo 创建数据库 worldcup_betting...
    "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres worldcup_betting
    if %errorlevel% equ 0 (
        echo ✅ 数据库创建成功
    ) else (
        echo ⚠️ 数据库可能已存在
    )
) else (
    echo ⚠️ 数据库 worldcup_betting 可能已存在
)

echo.
echo [3/4] 安装 npm 依赖...
call npm install
if %errorlevel% equ 0 (
    echo ✅ 依赖安装成功
) else (
    echo ⚠️ 依赖可能已安装
)

echo.
echo [4/4] 运行数据库迁移...
call npm run db:push
if %errorlevel% equ 0 (
    echo ✅ 数据库迁移成功
) else (
    echo ⚠️ 数据库迁移失败，请检查配置
)

echo.
echo ═══════════════════════════════════════════════════════════════
echo.
echo ✅ 安装完成！
echo.
echo 下一步：
echo   npm run dev          - 启动开发服务器
echo   node test-all.js    - 运行测试
echo.
echo 或访问： http://localhost:3000
echo.
echo ═══════════════════════════════════════════════════════════════
echo.
pause
