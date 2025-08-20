"""
Security Schemas for WinCloud Builder
Pydantic models for security-related API endpoints
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


# ================================
# 2FA SCHEMAS
# ================================

class Setup2FAResponse(BaseModel):
    """Response for 2FA setup"""
    success: bool
    qr_code: str = Field(..., description="Base64 encoded QR code image")
    backup_codes: List[str] = Field(..., description="Backup recovery codes")
    secret: str = Field(..., description="TOTP secret (for manual entry)")
    instructions: List[str] = Field(..., description="Setup instructions")


class Verify2FARequest(BaseModel):
    """Request to verify 2FA setup or token"""
    token: str = Field(..., min_length=6, max_length=8, description="6-digit TOTP code or backup code")


class TwoFactorTokenRequest(BaseModel):
    """Request for 2FA token verification"""
    token: str = Field(..., min_length=6, max_length=8, description="6-digit TOTP code or backup code")


class TwoFactorStatusResponse(BaseModel):
    """2FA status response"""
    enabled: bool
    setup_available: bool
    verified: Optional[bool] = None
    backup_codes_remaining: int
    last_used: Optional[str] = None
    created_at: Optional[str] = None


# ================================
# SESSION SCHEMAS
# ================================

class SessionResponse(BaseModel):
    """User session information"""
    session_id: str
    device_fingerprint: str = Field(..., description="Truncated device fingerprint")
    ip_address: str
    location: str = Field(..., description="City, Country")
    user_agent: Optional[str] = None
    created_at: str
    last_activity: str
    expires_at: str
    is_current: bool = Field(default=False, description="Whether this is the current session")


class CreateSessionRequest(BaseModel):
    """Request to create secure session"""
    device_name: Optional[str] = Field(None, description="User-friendly device name")
    remember_device: bool = Field(default=False, description="Mark device as trusted")


# ================================
# SECURITY EVENT SCHEMAS
# ================================

class SecurityEventResponse(BaseModel):
    """Security event information"""
    id: str
    event_type: str
    event_category: str = Field(default="authentication")
    risk_level: str = Field(..., description="low, medium, high, critical")
    ip_address: Optional[str] = None
    location: str = Field(default="Unknown")
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
    is_resolved: bool = Field(default=False)


class SecurityEventFilter(BaseModel):
    """Filter for security events"""
    event_type: Optional[str] = None
    risk_level: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=500)


# ================================
# API KEY MANAGEMENT SCHEMAS
# ================================

class APIKeyCreateRequest(BaseModel):
    """Request to create encrypted API key"""
    key_name: str = Field(..., min_length=1, max_length=100, description="User-friendly name for the key")
    key_type: str = Field(..., description="Type of API key (digitalocean, spaces, etc.)")
    api_key: str = Field(..., min_length=10, description="The actual API key to encrypt")
    permissions: Optional[Dict[str, Any]] = Field(None, description="Specific permissions/scopes")
    auto_expire: bool = Field(default=True, description="Auto-expire after 90 days")
    
    class Config:
        json_schema_extra = {
            "example": {
                "key_name": "DigitalOcean Production",
                "key_type": "digitalocean",
                "api_key": "dop_v1_abc123...",
                "permissions": {"scopes": ["read", "write"]},
                "auto_expire": True
            }
        }


class APIKeyResponse(BaseModel):
    """API key information (without exposing the key)"""
    id: str
    key_name: str
    key_type: str
    fingerprint: str = Field(..., description="Truncated key fingerprint for identification")
    last_used: Optional[str] = None
    usage_count: int
    created_at: str
    expires_at: Optional[str] = None
    is_expired: bool


class APIKeyListResponse(BaseModel):
    """List of API keys"""
    api_keys: List[APIKeyResponse]
    total_count: int


# ================================
# SECURITY DASHBOARD SCHEMAS
# ================================

class SecurityDashboardResponse(BaseModel):
    """Security dashboard metrics"""
    recent_events_24h: int = Field(..., description="Security events in last 24 hours")
    high_risk_events_7d: int = Field(..., description="High-risk events in last 7 days")
    active_sessions: int = Field(..., description="Currently active user sessions")
    blocked_ips: int = Field(..., description="Currently blocked IP addresses")
    security_alerts: int = Field(..., description="Open security alerts")
    failed_logins_24h: int = Field(..., description="Failed login attempts in 24h")
    successful_logins_24h: int = Field(..., description="Successful logins in 24h")
    two_fa_adoption_rate: float = Field(..., description="Percentage of users with 2FA enabled")
    total_users: int
    users_with_2fa: int
    timestamp: str = Field(..., description="Dashboard generation timestamp")


# ================================
# SECURITY ALERT SCHEMAS
# ================================

class SecurityAlertResponse(BaseModel):
    """Security alert information"""
    id: str
    alert_type: str
    severity: str = Field(..., description="low, medium, high, critical")
    title: str
    description: Optional[str] = None
    affected_user_id: Optional[str] = None
    affected_ip_address: Optional[str] = None
    status: str = Field(default="open", description="open, investigating, resolved, false_positive")
    priority: str = Field(default="medium")
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    alert_data: Optional[Dict[str, Any]] = None


class CreateSecurityAlertRequest(BaseModel):
    """Request to create security alert"""
    alert_type: str = Field(..., description="Type of security alert")
    severity: str = Field(..., description="low, medium, high, critical")
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    affected_user_id: Optional[str] = None
    affected_ip_address: Optional[str] = None
    alert_data: Optional[Dict[str, Any]] = None
    priority: str = Field(default="medium")


# ================================
# LOGIN ATTEMPT SCHEMAS
# ================================

class LoginAttemptResponse(BaseModel):
    """Login attempt information"""
    id: str
    user_id: Optional[str] = None
    email_attempted: str
    username_attempted: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    ip_address: str
    location: str = Field(default="Unknown")
    device_fingerprint: Optional[str] = None
    is_suspicious: bool = Field(default=False)
    risk_score: int = Field(default=0, description="Risk score 0-100")
    requires_2fa: bool = Field(default=False)
    two_fa_success: Optional[bool] = None
    created_at: str
    response_time_ms: Optional[int] = None


# ================================
# DEVICE FINGERPRINT SCHEMAS
# ================================

class DeviceFingerprintResponse(BaseModel):
    """Device fingerprint information"""
    id: str
    fingerprint_hash: str
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    is_trusted: bool = Field(default=False)
    trust_level: str = Field(default="unknown")
    first_seen: str
    last_seen: str
    login_count: int
    countries_seen: Optional[List[str]] = None
    cities_seen: Optional[List[str]] = None
    is_active: bool = Field(default=True)
    is_blocked: bool = Field(default=False)


class UpdateDeviceTrustRequest(BaseModel):
    """Request to update device trust level"""
    device_name: Optional[str] = Field(None, max_length=100)
    is_trusted: bool
    trust_level: str = Field(default="medium", description="unknown, low, medium, high")


# ================================
# PASSWORD SECURITY SCHEMAS
# ================================

class PasswordStrengthResponse(BaseModel):
    """Password strength analysis"""
    is_strong: bool
    score: int = Field(..., description="Password strength score 0-100")
    feedback: List[str] = Field(..., description="Improvement suggestions")
    requirements_met: Dict[str, bool] = Field(..., description="Which requirements are satisfied")


class ChangePasswordRequest(BaseModel):
    """Request to change password with security checks"""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)
    two_fa_token: Optional[str] = Field(None, description="Required if 2FA is enabled")
    
    class Config:
        json_schema_extra = {
            "example": {
                "current_password": "currentpass123",
                "new_password": "NewSecurePass123!",
                "two_fa_token": "123456"
            }
        }


# ================================
# SECURITY SETTINGS SCHEMAS
# ================================

class SecuritySettingsResponse(BaseModel):
    """User security settings"""
    two_fa_enabled: bool
    session_timeout: int = Field(..., description="Session timeout in seconds")
    max_concurrent_sessions: int
    password_last_changed: Optional[str] = None
    last_login: Optional[str] = None
    login_notifications: bool = Field(default=True)
    device_tracking: bool = Field(default=True)
    suspicious_activity_alerts: bool = Field(default=True)


class UpdateSecuritySettingsRequest(BaseModel):
    """Request to update security settings"""
    session_timeout: Optional[int] = Field(None, ge=300, le=86400, description="5 minutes to 24 hours")
    max_concurrent_sessions: Optional[int] = Field(None, ge=1, le=10)
    login_notifications: Optional[bool] = None
    device_tracking: Optional[bool] = None
    suspicious_activity_alerts: Optional[bool] = None


# ================================
# BACKUP AND RECOVERY SCHEMAS
# ================================

class BackupCodesResponse(BaseModel):
    """Backup codes response"""
    backup_codes: List[str]
    codes_remaining: int
    generated_at: str
    warning: str = "Store these codes securely. Each code can only be used once."


class RegenerateBackupCodesRequest(BaseModel):
    """Request to regenerate backup codes"""
    two_fa_token: str = Field(..., description="Current 2FA token to verify identity")
    confirm_regenerate: bool = Field(..., description="Confirmation that user wants to regenerate")


# ================================
# COMMON RESPONSE SCHEMAS
# ================================

class SecuritySuccessResponse(BaseModel):
    """Generic success response for security operations"""
    success: bool = Field(default=True)
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class SecurityErrorResponse(BaseModel):
    """Security error response"""
    success: bool = Field(default=False)
    error: str
    error_code: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    suggestions: Optional[List[str]] = Field(None, description="Suggestions to resolve the error")
