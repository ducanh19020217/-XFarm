-- Create test database if it doesn't exist
SELECT 'CREATE DATABASE xfarm_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'xfarm_test')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE xfarm_test TO xfarm;
