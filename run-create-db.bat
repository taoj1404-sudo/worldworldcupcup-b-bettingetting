@echo off
chcp 65001 >nul
echo.
echo 正在创建数据库...
echo.

"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f "C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting\create-db.sql"

if errorlevel 1 (
    echo.
    echo ⚠️ 数据库可能已存在或其他错误
    echo 继续尝试运行迁移...
)

echo.
pause
