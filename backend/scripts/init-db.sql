-- WinCloud Builder - Database Initialization Script
-- This script runs automatically when PostgreSQL container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create database if not exists (this is handled by POSTGRES_DB env var)
-- CREATE DATABASE wincloud;

-- Grant permissions to wincloud user
GRANT ALL PRIVILEGES ON DATABASE wincloud TO wincloud;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL ON SCHEMA public TO wincloud;

-- Set timezone
SET timezone = 'UTC';

-- Create basic indexes for performance
-- Note: SQLAlchemy will create the actual tables, but we can prepare some settings

-- Log successful initialization
INSERT INTO pg_stat_statements_info VALUES (0, 'WinCloud DB initialized successfully') ON CONFLICT DO NOTHING;

-- Create a simple health check function
CREATE OR REPLACE FUNCTION health_check() RETURNS TEXT AS $$
BEGIN
    RETURN 'Database is healthy - ' || now()::text;
END;
$$ LANGUAGE plpgsql;

COMMENT ON DATABASE wincloud IS 'WinCloud Builder - Windows RDP Management Platform';
