"""
Pydantic schemas for WinCloud Builder Authentication
Request/response validation and serialization models
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ProviderType(str, Enum):
    """Authentication provider types"""
    LOCAL = "local"
    GOOGLE = "google"
    FACEBOOK = "facebook"
    GITHUB = "github"

# Base User Schema
class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    username: Optional[str] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True

# User Registration Schemas
class UserRegistrationRequest(BaseModel):
    """Schema for user registration request"""
    email: EmailStr = Field(..., description="User's email address")
    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Optional username")
    password: str = Field(..., min_length=6, max_length=128, description="Password (min 6 chars)")
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")
    phone: Optional[str] = Field(None, min_length=10, max_length=20, description="Phone number (optional)")
    
    @validator('username')
    def validate_username(cls, v):
        if v is not None:
            # Allow alphanumeric, underscore, and dash
            if not v.replace('_', '').replace('-', '').isalnum():
                raise ValueError('Username can only contain letters, numbers, underscores, and dashes')
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            # Remove spaces, dashes, and parentheses
            cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')
            # Check if it's all digits
            if not cleaned.isdigit():
                raise ValueError('Phone number can only contain digits, spaces, dashes, parentheses, and plus sign')
            # Check length
            if len(cleaned) < 10 or len(cleaned) > 15:
                raise ValueError('Phone number must be between 10-15 digits')
        return v

class UserRegistrationResponse(BaseModel):
    """Schema for user registration response"""
    message: str
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

# Login Schemas
class UserLoginRequest(BaseModel):
    """Schema for user login request"""
    username: str = Field(..., description="User's email address or username")
    password: str = Field(..., description="User's password")

class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserResponse"

# User Response Schema
class UserResponse(BaseModel):
    """Schema for user response"""
    id: str
    email: str
    username: Optional[str]
    full_name: Optional[str]
    display_name: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    provider: str = "local"
    is_active: bool
    is_verified: bool
    is_superuser: bool = False
    created_at: Optional[datetime]
    last_login: Optional[datetime]

    class Config:
        from_attributes = True

# Profile Update Schemas
class UserProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    
    @validator('phone')
    def validate_phone(cls, v):
        if v is not None:
            cleaned = v.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').replace('+', '')
            if not cleaned.isdigit():
                raise ValueError('Phone number can only contain digits, spaces, dashes, parentheses, and plus sign')
            if len(cleaned) < 10 or len(cleaned) > 15:
                raise ValueError('Phone number must be between 10-15 digits')
        return v

# Password Change Schema
class PasswordChangeRequest(BaseModel):
    """Schema for password change request"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=6, max_length=128, description="New password (min 6 chars)")
    confirm_password: str = Field(..., description="Confirm new password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v

# Token Management Schemas
class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request"""
    refresh_token: str = Field(..., description="Valid refresh token")

class RefreshTokenResponse(BaseModel):
    """Schema for refresh token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# Logout Schema
class LogoutRequest(BaseModel):
    """Schema for logout request"""
    refresh_token: Optional[str] = Field(None, description="Refresh token to revoke")

class LogoutResponse(BaseModel):
    """Schema for logout response"""
    message: str
    revoked_sessions: int = 0

# OAuth Schemas
class OAuthCallbackRequest(BaseModel):
    """Schema for OAuth callback request"""
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = Field(None, description="State parameter for CSRF protection")
    provider: ProviderType = Field(..., description="OAuth provider type")

class OAuthCallbackResponse(BaseModel):
    """Schema for OAuth callback response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
    is_new_user: bool = False

# Account Linking Schemas
class AccountLinkingRequest(BaseModel):
    """Schema for linking OAuth account"""
    provider: ProviderType = Field(..., description="Provider to link")
    code: str = Field(..., description="Authorization code from provider")

class AccountLinkingResponse(BaseModel):
    """Schema for account linking response"""
    message: str
    provider: str
    linked_email: str

class AccountUnlinkRequest(BaseModel):
    """Schema for unlinking OAuth account"""
    provider: ProviderType = Field(..., description="Provider to unlink")

# Session Management Schemas
class UserSessionResponse(BaseModel):
    """Schema for user session response"""
    id: str
    device_info: Optional[str]
    created_at: datetime
    expires_at: datetime
    is_current: bool = False

class SessionListResponse(BaseModel):
    """Schema for session list response"""
    sessions: List[UserSessionResponse]
    total: int

# General Response Schemas
class MessageResponse(BaseModel):
    """Schema for general message response"""
    message: str
    success: bool = True

class ErrorResponse(BaseModel):
    """Schema for error response"""
    error: str
    detail: Optional[str] = None
    success: bool = False

# User Stats Schema
class UserStatsResponse(BaseModel):
    """Schema for user statistics response"""
    total_droplets: int = 0
    active_droplets: int = 0
    total_logins: int = 0
    last_login: Optional[datetime] = None
    account_created: Optional[datetime] = None

# Security Settings Schema
class UserSecuritySettings(BaseModel):
    """Schema for user security settings"""
    two_factor_enabled: bool = False
    login_notifications: bool = True
    session_timeout_minutes: int = 30

# Account Deactivation Schema
class DeactivateAccountRequest(BaseModel):
    """Schema for account deactivation"""
    password: str = Field(..., description="Current password for confirmation")
    reason: Optional[str] = Field(None, max_length=500, description="Optional reason for deactivation")

# Update forward references
UserRegistrationResponse.model_rebuild()
TokenResponse.model_rebuild()
OAuthCallbackResponse.model_rebuild()
