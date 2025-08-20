-- WinCloud Builder Database Initialization Script
-- This script sets up the initial database structure and data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create database if not exists (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS wincloud_prod;

-- Create users table with roles
-- This should match your SQLAlchemy models
-- Note: Actual table creation is handled by Alembic migrations

-- Insert default admin user (optional)
-- Password is 'admin123' hashed with bcrypt
-- You should change this in production
DO $$
BEGIN
    -- This will be executed after tables are created by Alembic
    -- Add any initial data here if needed
    
    -- Example: Create default admin role
    -- INSERT INTO roles (id, name, description, permissions) 
    -- VALUES (
    --     gen_random_uuid(),
    --     'super_admin',
    --     'Super Administrator with full access',
    --     '["*"]'
    -- ) ON CONFLICT (name) DO NOTHING;
    
    RAISE NOTICE 'Database initialization completed successfully';
END $$;
