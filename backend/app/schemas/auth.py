"""
Auth schemas - simplified imports for auth_schemas.py
"""

from .auth_schemas import (
    UserRegistrationRequest as UserCreate,
    UserResponse,
    UserLoginRequest as LoginRequest,
    TokenResponse as LoginResponse,
    UserUpdateRequest,
    PasswordChangeRequest,
    UserResponse as UserProfileResponse,
    TokenResponse,
    RefreshTokenRequest,
    ProviderType
)

# Export commonly used schemas
__all__ = [
    "UserCreate",
    "UserResponse", 
    "LoginRequest",
    "LoginResponse",
    "UserUpdateRequest",
    "PasswordChangeRequest",
    "UserProfileResponse",
    "TokenResponse",
    "RefreshTokenRequest",
    "ProviderType"
]
