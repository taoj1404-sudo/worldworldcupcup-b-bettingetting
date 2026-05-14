import subprocess
import sys
import os

psql_path = r'C:\Program Files\PostgreSQL\16\bin\psql.exe'
createdb_path = r'C:\Program Files\PostgreSQL\16\bin\createdb.exe'
project_dir = r'C:\Users\shipi\WorkBuddy\20260508113914\worldcup-betting'

env = os.environ.copy()
env['PGPASSWORD'] = 'postgres'

def run_cmd(cmd, cwd=None, desc=''):
    print(f'\n{desc}')
    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=cwd, timeout=30)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result.returncode == 0

print('╔══════════════════════════════════════════════╗')
print('║   WorldCup 竞猜平台 - 数据库初始化            ║')
print('╚══════════════════════════════════════════════╝')

# 1. 创建数据库
ok = run_cmd(
    [createdb_path, '-U', 'postgres', '-h', '127.0.0.1', 'worldcup_betting'],
    desc='[1/3] 创建数据库...'
)
if ok:
    print('✅ 数据库创建成功')
else:
    print('⚠️  数据库可能已存在，继续...')

# 2. 验证连接
ok = run_cmd(
    [psql_path, '-U', 'postgres', '-h', '127.0.0.1', '-d', 'worldcup_betting', '-c', 'SELECT current_database();'],
    desc='[2/3] 验证数据库连接...'
)
if ok:
    print('✅ 连接验证成功')
else:
    print('❌ 连接失败')
    sys.exit(1)

print('\n[3/3] 请手动运行以下命令完成迁移：')
print(f'  cd {project_dir}')
print('  npm run db:push')
print('  npm run dev')
