-- 创建数据库
SELECT 'CREATE DATABASE worldcup_betting' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'worldcup_betting');
CREATE DATABASE worldcup_betting;
