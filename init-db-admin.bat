@echo off
chcp 65001 >nul
:: 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 需要管理员权限，正在请求提权...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     WorldCup 竞猜平台 - 数据库初始化 (管理员)               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/5] 重启 PostgreSQL 服务（使新配置生效）...
net stop postgresql-x64-16
timeout /t 2 >nul
net start postgresql-x64-16
timeout /t 3 >nul
echo ✅ PostgreSQL 服务已重启

echo.
echo [2/5] 创建数据库...
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres worldcup_betting
if %errorlevel% equ 0 (
    echo ✅ 数据库 worldcup_betting 已创建
) else (
    echo ⚠️ 数据库可能已存在，继续...
)

echo.
echo [3/5] 验证连接...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "SELECT version();" worldcup_betting
if %errorlevel% equ 0 (
    echo ✅ 数据库连接正常
) else (
    echo ❌ 连接失败，请检查配置
    pause
    exit /b 1
)

echo.
echo [4/5] 进入项目目录运行迁移...
cd /d "C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting"
call npm run db:push
if %errorlevel% equ 0 (
    echo ✅ 数据库迁移完成
) else (
    echo ❌ 迁移失败，请查看上方错误信息
    pause
    exit /b 1
)

echo.
echo [5/5] 完成！
echo.
echo ═══════════════════════════════════════════════════════════════
echo  ✅ 数据库初始化成功！
echo.
echo  下一步：启动开发服务器
echo    cd C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting
echo    npm run dev
echo.
echo  然后在新窗口运行测试：
echo    node test-all.js
echo ═══════════════════════════════════════════════════════════════
echo.
pause
