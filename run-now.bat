@echo off
chcp 65001 >nul
cd /d "c:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting"

echo.
echo ═══════════════════════════════════════════════════════════════
echo   WorldCup 竞猜平台 - 启动中...
echo ═══════════════════════════════════════════════════════════════
echo.

echo [1/3] 创建数据库...
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres worldcup_betting
echo.

echo [2/3] 运行数据库迁移...
call npm run db:push
echo.

echo [3/3] 启动开发服务器...
echo.
echo ═══════════════════════════════════════════════════════════════
echo   🌐 访问地址: http://localhost:3000
echo   📝 测试: 打开新窗口运行 node test-all.js
echo ═══════════════════════════════════════════════════════════════
echo.

npm run dev
pause
