import subprocess
import sys

# 测试各种密码
passwords = ['postgres', '', 'admin', '123456', 'password']
psql_path = r'C:\Program Files\PostgreSQL\16\bin\psql.exe'

print('测试 PostgreSQL 连接...\n')

for pwd in passwords:
    try:
        import os
        env = os.environ.copy()
        env['PGPASSWORD'] = pwd
        result = subprocess.run(
            [psql_path, '-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-c', 'SELECT 1;'],
            capture_output=True,
            text=True,
            env=env,
            timeout=5
        )
        if result.returncode == 0:
            print(f'✅ 密码 "{pwd}" 连接成功！')
            print(result.stdout)
        else:
            print(f'❌ 密码 "{pwd}" 失败:')
            print(f'   stdout: {result.stdout}')
            print(f'   stderr: {result.stderr}')
    except subprocess.TimeoutExpired:
        print(f'⚠️ 密码 "{pwd}" 超时')
    except Exception as e:
        print(f'⚠️ 异常: {e}')
        break
