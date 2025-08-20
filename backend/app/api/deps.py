"""
Dependency functions for FastAPI endpoints
Common dependencies for database sessions, authentication, etc.
"""

from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.auth_models import User
from app.utils.permissions import is_admin, is_user, check_role_permission

# OAuth2 scheme for token authentication
security = HTTPBearer()


def get_db() -> Generator:
    """
    Database session dependency
    """
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    token: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get current authenticated user from JWT token with role loading
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
    
    # Load user with role relationship
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (wrapper for additional checks)
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current verified user
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified"
        )
    return current_user


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires admin role
    """
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_user_or_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency that requires user or admin role
    """
    if not (is_admin(current_user) or is_user(current_user)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required"
        )
    return current_user


def require_role(role_name: str):
    """
    Dependency factory that requires specific role
    
    Usage:
        require_admin_role = require_role("admin")
        @app.get("/admin-only", dependencies=[Depends(require_admin_role)])
    """
    def role_dependency(current_user: User = Depends(get_current_user)) -> User:
        if not current_user.has_role(role_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required"
            )
        return current_user
    return role_dependency


def check_permission_dependency(permission_category: str, permission_name: str):
    """
    Dependency factory for checking specific permissions
    
    Usage:
        check_create_user = check_permission_dependency("user_management", "create_user")
        @app.post("/users", dependencies=[Depends(check_create_user)])
    """
    def permission_dependency(current_user: User = Depends(get_current_user)) -> User:
        if not check_role_permission(current_user, permission_category, permission_name):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission_category}.{permission_name}' required"
            )
        return current_user
    return permission_dependency


def get_current_superuser(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure current user is a superuser/admin
    """
    if not is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser/Admin privileges required"
        )
    return current_user
