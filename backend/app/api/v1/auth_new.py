"""
Simple Authentication API for WinCloud Builder
Login and user profile endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.api.deps import get_db, get_current_user
from app.models.auth_models import User, AuditLog
from app.schemas.auth_schemas import (
    UserLoginRequest, TokenResponse, UserResponse, 
    UserRegistrationRequest, MessageResponse
)
from app.core.security import (
    verify_password, get_password_hash, 
    create_access_token, create_refresh_token
)

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Login user with email/username and password
    """
    # Find user by email or username
    db_user = db.query(User).filter(
        (User.email == user_data.username) | (User.username == user_data.username)
    ).first()
    
    if not db_user or not verify_password(user_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Update last login
    db_user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "full_name": db_user.full_name,
            "display_name": db_user.display_name,
            "avatar_url": db_user.avatar_url,
            "provider": db_user.provider,
            "is_active": db_user.is_active,
            "is_verified": db_user.is_verified,
            "created_at": db_user.created_at,
            "last_login": db_user.last_login
        }
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get current user profile (protected route)
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "display_name": current_user.display_name,
        "avatar_url": current_user.avatar_url,
        "provider": current_user.provider,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at,
        "last_login": current_user.last_login
    }

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegistrationRequest, db: Session = Depends(get_db)):
    """
    Register new user account
    """
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.email == user_data.email) | (User.username == user_data.username)
    ).first()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        display_name=user_data.display_name or user_data.full_name or user_data.username,
        password_hash=hashed_password,
        provider="email",
        is_active=True,
        is_verified=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(db_user.id)})
    refresh_token = create_refresh_token(data={"sub": str(db_user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "full_name": db_user.full_name,
            "display_name": db_user.display_name,
            "avatar_url": db_user.avatar_url,
            "provider": db_user.provider,
            "is_active": db_user.is_active,
            "is_verified": db_user.is_verified,
            "created_at": db_user.created_at,
            "last_login": db_user.last_login
        }
    }

@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: User = Depends(get_current_user)):
    """
    Logout user
    """
    return {"message": "Successfully logged out", "success": True}
