"""
Enhanced Authentication endpoints for WinCloud Builder
Registration, login, logout, and profile management with session tracking
"""

from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
import os
import uuid
from pathlib import Path

from app.api import deps
from app.core import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    decode_token,
    generate_token
)
from app.models import User, UserSession, UserProvider, AuditLog
from app.schemas.auth_schemas import (
    UserRegistrationRequest,
    UserRegistrationResponse,
    UserLoginRequest,
    TokenResponse,
    UserResponse,
    UserProfileUpdate,
    PasswordChangeRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    LogoutRequest,
    LogoutResponse,
    MessageResponse,
    SessionListResponse,
    UserSessionResponse
)

router = APIRouter()


@router.post("/register", response_model=UserRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register(
    *,
    db: Session = Depends(deps.get_db),
    user_data: UserRegistrationRequest,
    request: Request
) -> Any:
    """
    Register new user with email and password
    """
    # Check if email already exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists (if provided)
    if user_data.username:
        db_user = db.query(User).filter(User.username == user_data.username).first()
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        phone=user_data.phone,
        avatar_url="/static/default-avatar.svg",  # Set default avatar
        provider="local",
        is_active=True,
        is_verified=True,  # Auto-verify for demo
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens with session tracking
    jti_access = generate_token(16)
    jti_refresh = generate_token(16)
    
    access_token = create_access_token(
        subject=str(db_user.id),
        additional_claims={"jti": jti_access}
    )
    refresh_token = create_refresh_token(
        subject=str(db_user.id),
        additional_claims={"jti": jti_refresh}
    )
    
    # Create session record
    session = UserSession(
        user_id=str(db_user.id),
        jti=jti_access,
        device_info=request.headers.get("User-Agent", "Unknown"),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        is_revoked=False
    )
    db.add(session)
    
    # Log registration event
    audit_log = AuditLog(
        user_id=str(db_user.id),
        action="register",
        details=f"User registered with email: {db_user.email}",
        ip_address=request.client.host,
        user_agent=request.headers.get("User-Agent", "Unknown")
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": "User registered successfully",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        "user": UserResponse.from_orm(db_user)
    }


@router.post("/login", response_model=TokenResponse)
async def login(
    *,
    db: Session = Depends(deps.get_db),
    user_credentials: UserLoginRequest,
    request: Request
) -> Any:
    """
    Authenticate user and return access tokens
    """
    # Find user by email
    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        # Log failed login attempt
        audit_log = AuditLog(
            action="login_failed",
            details=f"Failed login attempt for email: {user_credentials.email}",
            ip_address=request.client.host,
            user_agent=request.headers.get("User-Agent", "Unknown")
        )
        db.add(audit_log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Create tokens with session tracking
    jti_access = generate_token(16)
    jti_refresh = generate_token(16)
    
    access_token = create_access_token(
        subject=str(user.id),
        additional_claims={"jti": jti_access}
    )
    refresh_token = create_refresh_token(
        subject=str(user.id),
        additional_claims={"jti": jti_refresh}
    )
    
    # Create session record
    session = UserSession(
        user_id=str(user.id),
        jti=jti_access,
        device_info=request.headers.get("User-Agent", "Unknown"),
        expires_at=datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        is_revoked=False
    )
    db.add(session)
    
    # Log successful login
    audit_log = AuditLog(
        user_id=str(user.id),
        action="login",
        details=f"Successful login",
        ip_address=request.client.host,
        user_agent=request.headers.get("User-Agent", "Unknown")
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserResponse.from_orm(user)
    }


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    *,
    db: Session = Depends(deps.get_db),
    token_data: RefreshTokenRequest
) -> Any:
    """
    Refresh access token using refresh token
    """
    try:
        payload = decode_token(token_data.refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        jti = payload.get("jti")
        
        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Check if refresh token is revoked
        session = db.query(UserSession).filter(UserSession.jti == jti).first()
        if session and session.is_revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked"
            )
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new tokens
        new_jti_access = generate_token(16)
        new_jti_refresh = generate_token(16)
        
        new_access_token = create_access_token(
            subject=str(user.id),
            additional_claims={"jti": new_jti_access}
        )
        new_refresh_token = create_refresh_token(
            subject=str(user.id),
            additional_claims={"jti": new_jti_refresh}
        )
        
        # Create new session
        new_session = UserSession(
            user_id=str(user.id),
            jti=new_jti_access,
            device_info=session.device_info if session else "Unknown",
            expires_at=datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
            is_revoked=False
        )
        db.add(new_session)
        
        # Revoke old session if exists
        if session:
            session.is_revoked = True
        
        db.commit()
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    logout_data: Optional[LogoutRequest] = None
) -> Any:
    """
    Logout user and revoke tokens
    """
    revoked_count = 0
    
    # Revoke all sessions for the user
    sessions = db.query(UserSession).filter(
        UserSession.user_id == str(current_user.id),
        UserSession.is_revoked == False
    ).all()
    
    for session in sessions:
        session.is_revoked = True
        revoked_count += 1
    
    # Log logout event
    audit_log = AuditLog(
        user_id=str(current_user.id),
        action="logout",
        details=f"User logged out, revoked {revoked_count} sessions"
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": "Successfully logged out",
        "revoked_sessions": revoked_count
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get current user profile
    """
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    profile_data: UserProfileUpdate
) -> Any:
    """
    Update current user profile
    """
    update_data = profile_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    current_user.updated_at = datetime.utcnow()
    
    # Log profile update
    audit_log = AuditLog(
        user_id=str(current_user.id),
        action="profile_update",
        details=f"Updated fields: {list(update_data.keys())}"
    )
    db.add(audit_log)
    db.commit()
    db.refresh(current_user)
    
    return UserResponse.from_orm(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    password_data: PasswordChangeRequest
) -> Any:
    """
    Change user password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    
    # Revoke all existing sessions (force re-login)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == str(current_user.id),
        UserSession.is_revoked == False
    ).all()
    
    for session in sessions:
        session.is_revoked = True
    
    # Log password change
    audit_log = AuditLog(
        user_id=str(current_user.id),
        action="password_change",
        details="Password changed successfully"
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "message": "Password changed successfully. Please log in again.",
        "success": True
    }


@router.get("/sessions", response_model=SessionListResponse)
async def get_user_sessions(
    *,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Get user's active sessions
    """
    sessions = db.query(UserSession).filter(
        UserSession.user_id == str(current_user.id),
        UserSession.is_revoked == False
    ).order_by(UserSession.created_at.desc()).all()
    
    session_responses = []
    for session in sessions:
        session_responses.append(UserSessionResponse(
            id=str(session.id),
            device_info=session.device_info,
            created_at=session.created_at,
            expires_at=session.expires_at,
            is_current=False  # Could be enhanced to detect current session
        ))
    
    return {
        "sessions": session_responses,
        "total": len(session_responses)
    }
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(
        subject=str(user.id), expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/logout")
async def logout(
    *,
    current_user: User = Depends(deps.get_current_user)
) -> Any:
    """
    Logout the current user.
    
    Note: In a production environment, you would typically blacklist the token here.
    
    Returns:
        Success message
    """
    # In a real application, you would blacklist the token here
    # For now, we'll just return a success message
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Get current user profile.
    
    Returns:
        Current user information
    """
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_user_profile(
    *,
    db: Session = Depends(deps.get_db),
    full_name: str = None,
    current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """
    Update current user profile.
    
    Args:
        full_name: New full name
        
    Returns:
        Updated user information
    """
    if full_name is not None:
        current_user.full_name = full_name
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
    
    return current_user


@router.post("/refresh", response_model=Token)
async def refresh_token(
    *,
    db: Session = Depends(deps.get_db),
    token_request: RefreshTokenRequest
) -> Any:
    """
    Refresh access token using refresh token.
    
    Returns:
        New access and refresh tokens
        
    Raises:
        401: If refresh token is invalid
    """
    try:
        payload = decode_token(token_request.refresh_token)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        
        if not user_id or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Create new tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    new_refresh_token = create_refresh_token(
        subject=str(user.id), expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }
