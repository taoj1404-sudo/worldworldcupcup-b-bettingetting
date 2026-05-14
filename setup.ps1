# WorldCup 竞猜平台 - 自动化安装脚本
# 运行方式: .\setup.ps1

param(
    [switch]$SkipPostgres,
    [switch]$UseDocker,
    [switch]$SkipTests
)

$ErrorActionPreference = "Continue"

function Write-Step($message) {
    Write-Host "`n[STEP] $message" -ForegroundColor Cyan
}

function Write-Success($message) {
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Warning($message) {
    Write-Host "[WARN] $message" -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
}

# 标题
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     WorldCup 竞猜平台 - 自动化安装脚本                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Node.js
Write-Step "检查 Node.js..."
try {
    $nodeVersion = node -v
    Write-Success "Node.js $nodeVersion 已安装"
} catch {
    Write-Error "Node.js 未安装"
    Write-Host "请从 https://nodejs.org/ 下载安装 Node.js 18+"
    exit 1
}

# 2. 检查 npm
Write-Step "检查 npm..."
try {
    $npmVersion = npm -v
    Write-Success "npm $npmVersion 已安装"
} catch {
    Write-Error "npm 未安装"
    exit 1
}

# 3. 检查 PostgreSQL
Write-Step "检查 PostgreSQL..."
$postgresRunning = $false

if ($UseDocker) {
    Write-Host "使用 Docker 模式..." -ForegroundColor Yellow
    
    # 检查 Docker
    try {
        docker --version | Out-Null
        Write-Success "Docker 已安装"
    } catch {
        Write-Error "Docker 未安装"
        Write-Host "请从 https://docker.com 下载安装 Docker Desktop"
        exit 1
    }
    
    # 启动 PostgreSQL Docker
    Write-Step "启动 PostgreSQL Docker 容器..."
    docker run --name worldcup-postgres `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=worldcup_betting `
        -p 5432:5432 `
        -v postgres_data:/var/lib/postgresql/data `
        -d postgres:16 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "PostgreSQL Docker 容器已启动"
        $postgresRunning = $true
    } else {
        Write-Warning "PostgreSQL Docker 可能已在运行或启动失败"
        $postgresRunning = $true
    }
    
} elseif (-not $SkipPostgres) {
    # 检查端口 5432
    $postgresProcess = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
    
    if ($postgresProcess) {
        Write-Success "PostgreSQL 正在运行（端口 5432）"
        $postgresRunning = $true
    } else {
        Write-Warning "PostgreSQL 未运行"
        Write-Host ""
        Write-Host "请选择安装方式：" -ForegroundColor Yellow
        Write-Host "  1. 安装 PostgreSQL（需要下载安装程序）"
        Write-Host "  2. 使用 Docker（需要安装 Docker Desktop）"
        Write-Host "  3. 跳过（仅测试前端）"
        Write-Host ""
        $choice = Read-Host "请选择 (1/2/3)"
        
        switch ($choice) {
            "1" {
                Write-Host "请从以下地址下载 PostgreSQL：" -ForegroundColor Yellow
                Write-Host "  https://www.postgresql.org/download/windows/"
                Write-Host ""
                Write-Host "安装后请手动运行以下命令创建数据库：" -ForegroundColor Yellow
                Write-Host "  psql -U postgres -c ""CREATE DATABASE worldcup_betting;"""
                exit 0
            }
            "2" {
                Write-Host "请从以下地址下载 Docker Desktop：" -ForegroundColor Yellow
                Write-Host "  https://docker.com"
                exit 0
            }
            "3" {
                Write-Warning "跳过数据库设置（部分功能将不可用）"
            }
        }
    }
}

# 4. 安装依赖
Write-Step "安装 npm 依赖..."
Set-Location -Path $PSScriptRoot
npm install 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Success "依赖安装完成"
} else {
    Write-Error "依赖安装失败"
    exit 1
}

# 5. 数据库迁移
if ($postgresRunning) {
    Write-Step "运行数据库迁移..."
    
    # 创建数据库（如果不存在）
    if (-not $UseDocker) {
        try {
            psql -U postgres -c "CREATE DATABASE worldcup_betting;" 2>$null
            Write-Success "数据库创建成功"
        } catch {
            Write-Success "数据库已存在"
        }
    }
    
    npm run db:push 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "数据库迁移完成"
    } else {
        Write-Warning "数据库迁移可能失败，请检查配置"
    }
    
    # 种子数据
    Write-Host ""
    $seedChoice = Read-Host "是否填充测试数据？(y/N)"
    
    if ($seedChoice -eq "y" -or $seedChoice -eq "Y") {
        Write-Step "填充测试数据..."
        npm run db:seed 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "测试数据填充完成"
        } else {
            Write-Warning "测试数据填充失败"
        }
    }
}

# 6. 运行测试
if (-not $SkipTests) {
    Write-Host ""
    $testChoice = Read-Host "是否运行测试？(Y/n)"
    
    if ($testChoice -ne "n" -and $testChoice -ne "N") {
        Write-Step "运行健康检查测试..."
        node test-health.js
    }
}

# 7. 启动应用
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Success "安装完成！"
Write-Host ""
Write-Host "启动应用：" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host ""
Write-Host "访问地址：" -ForegroundColor Yellow
Write-Host "  http://localhost:3000"
Write-Host ""
Write-Host "测试脚本：" -ForegroundColor Yellow
Write-Host "  node test-health.js    # 健康检查"
Write-Host "  node test-auth.js      # 认证测试"
Write-Host "  node test-all.js       # 综合测试"
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# 询问是否立即启动
$startChoice = Read-Host "是否立即启动开发服务器？(Y/n)"

if ($startChoice -ne "n" -and $startChoice -ne "N") {
    Write-Host ""
    Write-Host "启动开发服务器（按 Ctrl+C 停止）..." -ForegroundColor Cyan
    Write-Host ""
    
    npm run dev
}
