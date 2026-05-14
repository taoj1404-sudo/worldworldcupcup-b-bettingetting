@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║        PostgreSQL 安装脚本 - WorldCup 竞猜平台                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

:: 检查是否已经安装
where psql >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL 已安装
    psql --version
    echo.
    goto :create_db
)

:: 检查 Chocolatey
where choco >nul 2>&1
if %errorlevel% equ 0 (
    echo 发现 Chocolatey，将使用它安装 PostgreSQL...
    echo.
    choco install postgresql16 -y --params "/registerService"
    if errorlevel 1 (
        echo ⚠️ Chocolatey 安装失败，尝试其他方法...
        goto :manual_install
    )
    goto :check_installation
)

:manual_install
echo.
echo ═════════════════════════════════════════════════════════════════
echo.
echo   PostgreSQL 未安装！
echo.
echo   请选择安装方式：
echo.
echo   1. 自动下载安装（推荐）
echo      - 访问 https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64.exe
echo      - 下载后双击运行安装程序
echo.
echo   2. 使用 winget 安装（需要 Windows 10/11）
echo      - 打开 PowerShell 运行：winget install PostgreSQL.PostgreSQL.16
echo.
echo   3. 使用 Chocolatey（需要先安装 Chocolatey）
echo      - 打开 PowerShell 运行：
echo        Set-ExecutionPolicy Bypass -Scope -Force; iwr https://chocolatey.org/install.ps1 -UseBasicParsing ^| iex
echo        choco install postgresql16 -y
echo.
echo ═════════════════════════════════════════════════════════════════
echo.
echo   📝 安装时请记住：
echo      - 安装目录（默认：C:\Program Files\PostgreSQL\16）
echo      - 超级用户密码（默认密码：postgres）
echo      - 端口（默认：5432）
echo.
echo   安装完成后，请重新运行此脚本
echo.
pause
exit /b 1

:check_installation
echo.
echo 检查 PostgreSQL 安装...
where psql >nul 2>&1
if errorlevel 1 (
    echo ⚠️ PostgreSQL 安装可能失败
    echo 请手动检查安装状态
    pause
    exit /b 1
)

:create_db
echo.
echo [1/2] 检查 PostgreSQL 服务状态...
netstat -ano | findstr ":5432" >nul
if errorlevel 1 (
    echo ⚠️ PostgreSQL 服务可能未启动
    echo 尝试启动服务...
    
    :: 尝试启动服务
    net start postgresql-x64-16 >nul 2>&1
    if errorlevel 1 (
        echo ⚠️ 无法自动启动服务
        echo 请手动启动 PostgreSQL 服务：
        echo   1. 打开"服务"应用（Win+R 输入 services.msc）
        echo   2. 找到 "postgresql-x64-16" 服务
        echo   3. 右键选择"启动"
        echo.
        pause
    ) else (
        echo ✅ PostgreSQL 服务已启动
    )
)

timeout /t 2 >nul

echo.
echo [2/2] 创建数据库...
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = 'worldcup_betting';" | findstr "1" >nul
if errorlevel 1 (
    echo 创建数据库 worldcup_betting...
    psql -U postgres -c "CREATE DATABASE worldcup_betting;"
    if errorlevel 1 (
        echo ❌ 数据库创建失败
        echo 请检查 PostgreSQL 配置
        pause
        exit /b 1
    )
    echo ✅ 数据库创建成功
) else (
    echo ✅ 数据库 worldcup_betting 已存在
)

echo.
echo ═════════════════════════════════════════════════════════════════
echo.
echo ✅ PostgreSQL 安装和配置完成！
echo.
echo 下一步操作：
echo   1. cd worldcup-betting
echo   2. npm run db:push
echo   3. npm run db:seed
echo   4. npm run dev
echo.
echo   或者运行：node check-status.js 查看项目状态
echo.
echo ═════════════════════════════════════════════════════════════════
echo.
pause
