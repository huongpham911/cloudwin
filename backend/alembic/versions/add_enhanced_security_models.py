"""Add enhanced security models

Revision ID: security_models_001
Revises: b45aa30d7839
Create Date: 2024-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'security_models_001'
down_revision = 'b45aa30d7839'
branch_labels = None
depends_on = None


def upgrade():
    # Create two_factor_auth table
    op.create_table('two_factor_auth',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('secret', sa.Text(), nullable=False),
        sa.Column('backup_codes', sa.Text(), nullable=True),
        sa.Column('is_enabled', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('disabled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recovery_codes_generated', sa.Integer(), nullable=True),
        sa.Column('recovery_codes_used', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create user_sessions table
    op.create_table('user_sessions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('device_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('ip_address', sa.String(length=45), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('location_country', sa.String(length=2), nullable=True),
        sa.Column('location_city', sa.String(length=100), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_2fa_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_activity', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('terminated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('termination_reason', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create security_events table
    op.create_table('security_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('session_id', sa.String(length=64), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('event_category', sa.String(length=20), nullable=True),
        sa.Column('risk_level', sa.String(length=10), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('location_country', sa.String(length=2), nullable=True),
        sa.Column('location_city', sa.String(length=100), nullable=True),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('request_path', sa.String(length=255), nullable=True),
        sa.Column('request_method', sa.String(length=10), nullable=True),
        sa.Column('response_status', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('is_resolved', sa.Boolean(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.String(length=36), nullable=True),
        sa.Column('resolution_notes', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create api_key_management table
    op.create_table('api_key_management',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('key_name', sa.String(length=100), nullable=False),
        sa.Column('key_type', sa.String(length=50), nullable=False),
        sa.Column('encrypted_key', sa.Text(), nullable=False),
        sa.Column('key_fingerprint', sa.String(length=64), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('allowed_operations', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_revoked', sa.Boolean(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rotation_reminder_sent', sa.Boolean(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_by', sa.String(length=36), nullable=True),
        sa.Column('revocation_reason', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create security_alerts table
    op.create_table('security_alerts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('alert_type', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=10), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('affected_user_id', sa.String(length=36), nullable=True),
        sa.Column('affected_ip_address', sa.String(length=45), nullable=True),
        sa.Column('affected_resource', sa.String(length=255), nullable=True),
        sa.Column('alert_data', sa.JSON(), nullable=True),
        sa.Column('evidence', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('priority', sa.String(length=10), nullable=True),
        sa.Column('assigned_to', sa.String(length=36), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolution_summary', sa.Text(), nullable=True),
        sa.Column('resolution_actions', sa.JSON(), nullable=True),
        sa.Column('false_positive', sa.Boolean(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create login_attempts table
    op.create_table('login_attempts',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('email_attempted', sa.String(length=255), nullable=False),
        sa.Column('username_attempted', sa.String(length=100), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.String(length=100), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=False),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('device_fingerprint', sa.String(length=64), nullable=True),
        sa.Column('location_country', sa.String(length=2), nullable=True),
        sa.Column('location_city', sa.String(length=100), nullable=True),
        sa.Column('is_suspicious', sa.Boolean(), nullable=True),
        sa.Column('risk_score', sa.Integer(), nullable=True),
        sa.Column('requires_2fa', sa.Boolean(), nullable=True),
        sa.Column('two_fa_success', sa.Boolean(), nullable=True),
        sa.Column('two_fa_method', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create password_history table
    op.create_table('password_history',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create device_fingerprints table
    op.create_table('device_fingerprints',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('fingerprint_hash', sa.String(length=64), nullable=False),
        sa.Column('device_name', sa.String(length=100), nullable=True),
        sa.Column('device_type', sa.String(length=20), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('screen_resolution', sa.String(length=20), nullable=True),
        sa.Column('timezone', sa.String(length=50), nullable=True),
        sa.Column('language', sa.String(length=10), nullable=True),
        sa.Column('is_trusted', sa.Boolean(), nullable=True),
        sa.Column('trust_level', sa.String(length=10), nullable=True),
        sa.Column('first_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('login_count', sa.Integer(), nullable=True),
        sa.Column('countries_seen', sa.JSON(), nullable=True),
        sa.Column('cities_seen', sa.JSON(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_blocked', sa.Boolean(), nullable=True),
        sa.Column('blocked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('blocked_reason', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for better performance
    op.create_index('idx_user_sessions_user_id', 'user_sessions', ['user_id'])
    op.create_index('idx_user_sessions_active', 'user_sessions', ['is_active'])
    op.create_index('idx_user_sessions_expires', 'user_sessions', ['expires_at'])
    
    op.create_index('idx_security_events_user_id', 'security_events', ['user_id'])
    op.create_index('idx_security_events_type', 'security_events', ['event_type'])
    op.create_index('idx_security_events_risk', 'security_events', ['risk_level'])
    op.create_index('idx_security_events_created', 'security_events', ['created_at'])
    
    op.create_index('idx_api_keys_user_id', 'api_key_management', ['user_id'])
    op.create_index('idx_api_keys_active', 'api_key_management', ['is_active'])
    op.create_index('idx_api_keys_fingerprint', 'api_key_management', ['key_fingerprint'])
    
    op.create_index('idx_login_attempts_email', 'login_attempts', ['email_attempted'])
    op.create_index('idx_login_attempts_ip', 'login_attempts', ['ip_address'])
    op.create_index('idx_login_attempts_success', 'login_attempts', ['success'])
    op.create_index('idx_login_attempts_created', 'login_attempts', ['created_at'])
    
    op.create_index('idx_password_history_user_id', 'password_history', ['user_id'])
    
    op.create_index('idx_device_fingerprints_user_id', 'device_fingerprints', ['user_id'])
    op.create_index('idx_device_fingerprints_hash', 'device_fingerprints', ['fingerprint_hash'])
    op.create_index('idx_device_fingerprints_trusted', 'device_fingerprints', ['is_trusted'])


def downgrade():
    # Drop indexes first
    op.drop_index('idx_device_fingerprints_trusted', table_name='device_fingerprints')
    op.drop_index('idx_device_fingerprints_hash', table_name='device_fingerprints')
    op.drop_index('idx_device_fingerprints_user_id', table_name='device_fingerprints')
    op.drop_index('idx_password_history_user_id', table_name='password_history')
    op.drop_index('idx_login_attempts_created', table_name='login_attempts')
    op.drop_index('idx_login_attempts_success', table_name='login_attempts')
    op.drop_index('idx_login_attempts_ip', table_name='login_attempts')
    op.drop_index('idx_login_attempts_email', table_name='login_attempts')
    op.drop_index('idx_api_keys_fingerprint', table_name='api_key_management')
    op.drop_index('idx_api_keys_active', table_name='api_key_management')
    op.drop_index('idx_api_keys_user_id', table_name='api_key_management')
    op.drop_index('idx_security_events_created', table_name='security_events')
    op.drop_index('idx_security_events_risk', table_name='security_events')
    op.drop_index('idx_security_events_type', table_name='security_events')
    op.drop_index('idx_security_events_user_id', table_name='security_events')
    op.drop_index('idx_user_sessions_expires', table_name='user_sessions')
    op.drop_index('idx_user_sessions_active', table_name='user_sessions')
    op.drop_index('idx_user_sessions_user_id', table_name='user_sessions')
    
    # Drop tables
    op.drop_table('device_fingerprints')
    op.drop_table('password_history')
    op.drop_table('login_attempts')
    op.drop_table('security_alerts')
    op.drop_table('api_key_management')
    op.drop_table('security_events')
    op.drop_table('user_sessions')
    op.drop_table('two_factor_auth')
