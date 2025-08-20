"""
Security Models for WinCloud Builder
Enhanced security features including 2FA, sessions, and audit logging
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, Integer, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class TwoFactorAuth(Base):
    """Two-Factor Authentication settings for users"""
    __tablename__ = "two_factor_auth"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, unique=True)  # One 2FA per user
    
    # Encrypted TOTP secret
    secret = Column(Text, nullable=False)  # Encrypted with app key
    
    # Encrypted backup codes (JSON array)
    backup_codes = Column(Text, nullable=True)  # JSON array of encrypted codes
    
    # Status
    is_enabled = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    verified_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    disabled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Recovery info
    recovery_codes_generated = Column(Integer, default=10)
    recovery_codes_used = Column(Integer, default=0)


# Temporarily disabled due to table name conflict with auth_models.py
# Will be re-enabled after refactoring session management
# 
# class EnhancedUserSession(Base):
#     """Enhanced user sessions with device tracking"""
#     __tablename__ = "enhanced_user_sessions"
#     
#     id = Column(String(64), primary_key=True)  # Session ID
#     user_id = Column(String(36), nullable=False)
#     
#     # Device and location info
#     device_fingerprint = Column(String(64), nullable=False)
#     ip_address = Column(String(45), nullable=False)  # IPv6 support
#     user_agent = Column(Text, nullable=True)
#     location_country = Column(String(2), nullable=True)  # ISO country code
#     location_city = Column(String(100), nullable=True)
#     
#     # Session status
#     is_active = Column(Boolean, default=True)
#     is_2fa_verified = Column(Boolean, default=False)
#     
#     # Timestamps
#     created_at = Column(DateTime(timezone=True), server_default=func.now())
#     expires_at = Column(DateTime(timezone=True), nullable=False)
#     last_activity = Column(DateTime(timezone=True), server_default=func.now())
#     terminated_at = Column(DateTime(timezone=True), nullable=True)
#     
#     # Termination info
#     termination_reason = Column(String(50), nullable=True)  # logout, timeout, security, etc.


class SecurityEvent(Base):
    """Detailed security event logging"""
    __tablename__ = "security_events"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)  # Can be null for system events
    session_id = Column(String(64), nullable=True)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # login, logout, 2fa_setup, etc.
    event_category = Column(String(20), default="authentication")  # auth, session, data, system
    risk_level = Column(String(10), default="low")  # low, medium, high, critical
    
    # Context information
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    location_country = Column(String(2), nullable=True)
    location_city = Column(String(100), nullable=True)
    
    # Detailed event data (JSON)
    details = Column(JSON, nullable=True)
    
    # Request info
    request_path = Column(String(255), nullable=True)
    request_method = Column(String(10), nullable=True)
    response_status = Column(Integer, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Resolution (for incidents)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(36), nullable=True)  # Admin user ID
    resolution_notes = Column(Text, nullable=True)


class APIKeyManagement(Base):
    """API Key management with rotation and encryption"""
    __tablename__ = "api_key_management"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    
    # Key identification
    key_name = Column(String(100), nullable=False)  # User-friendly name
    key_type = Column(String(50), nullable=False)  # digitalocean, spaces, etc.
    
    # Encrypted key data
    encrypted_key = Column(Text, nullable=False)  # Encrypted API key
    key_fingerprint = Column(String(64), nullable=False)  # SHA256 hash for identification
    
    # Permissions and scope
    permissions = Column(JSON, nullable=True)  # Specific permissions/scopes
    allowed_operations = Column(JSON, nullable=True)  # Allowed operations
    
    # Status
    is_active = Column(Boolean, default=True)
    is_revoked = Column(Boolean, default=False)
    
    # Usage tracking
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Rotation schedule
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    rotation_reminder_sent = Column(Boolean, default=False)
    
    # Revocation info
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(String(36), nullable=True)  # Admin user ID
    revocation_reason = Column(String(255), nullable=True)


class SecurityAlert(Base):
    """Security alerts and incidents"""
    __tablename__ = "security_alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Alert details
    alert_type = Column(String(50), nullable=False)  # brute_force, suspicious_login, etc.
    severity = Column(String(10), nullable=False)  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Affected entities
    affected_user_id = Column(String(36), nullable=True)
    affected_ip_address = Column(String(45), nullable=True)
    affected_resource = Column(String(255), nullable=True)
    
    # Alert data
    alert_data = Column(JSON, nullable=True)  # Detailed alert information
    evidence = Column(JSON, nullable=True)  # Supporting evidence
    
    # Status
    status = Column(String(20), default="open")  # open, investigating, resolved, false_positive
    priority = Column(String(10), default="medium")  # low, medium, high, urgent
    
    # Assignment
    assigned_to = Column(String(36), nullable=True)  # Admin user ID
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    resolution_summary = Column(Text, nullable=True)
    resolution_actions = Column(JSON, nullable=True)  # Actions taken
    false_positive = Column(Boolean, default=False)


class LoginAttempt(Base):
    """Detailed login attempt tracking"""
    __tablename__ = "login_attempts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # User identification
    user_id = Column(String(36), nullable=True)  # Null for failed attempts
    email_attempted = Column(String(255), nullable=False)
    username_attempted = Column(String(100), nullable=True)
    
    # Attempt details
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(100), nullable=True)  # invalid_credentials, account_locked, etc.
    
    # Device and location
    ip_address = Column(String(45), nullable=False)
    user_agent = Column(Text, nullable=True)
    device_fingerprint = Column(String(64), nullable=True)
    location_country = Column(String(2), nullable=True)
    location_city = Column(String(100), nullable=True)
    
    # Security flags
    is_suspicious = Column(Boolean, default=False)
    risk_score = Column(Integer, default=0)  # 0-100 risk score
    
    # 2FA information
    requires_2fa = Column(Boolean, default=False)
    two_fa_success = Column(Boolean, nullable=True)
    two_fa_method = Column(String(20), nullable=True)  # totp, backup_code, etc.
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Response time (for monitoring)
    response_time_ms = Column(Integer, nullable=True)


class PasswordHistory(Base):
    """Password history to prevent reuse"""
    __tablename__ = "password_history"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    
    # Password hash (for comparison)
    password_hash = Column(String(255), nullable=False)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DeviceFingerprint(Base):
    """Known device fingerprints for users"""
    __tablename__ = "device_fingerprints"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    
    # Device identification
    fingerprint_hash = Column(String(64), nullable=False)
    device_name = Column(String(100), nullable=True)  # User-provided name
    device_type = Column(String(20), nullable=True)  # mobile, desktop, tablet
    
    # Device details
    user_agent = Column(Text, nullable=True)
    screen_resolution = Column(String(20), nullable=True)
    timezone = Column(String(50), nullable=True)
    language = Column(String(10), nullable=True)
    
    # Trust status
    is_trusted = Column(Boolean, default=False)
    trust_level = Column(String(10), default="unknown")  # unknown, low, medium, high
    
    # Usage tracking
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    login_count = Column(Integer, default=1)
    
    # Location tracking
    countries_seen = Column(JSON, nullable=True)  # Array of country codes
    cities_seen = Column(JSON, nullable=True)  # Array of cities
    
    # Status
    is_active = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    blocked_at = Column(DateTime(timezone=True), nullable=True)
    blocked_reason = Column(String(255), nullable=True)
