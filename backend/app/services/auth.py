from datetime import timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends
from starlette import status

from app.core.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token,
    decode_token
)
from app.core.config import settings
from app.models import User
from app.schemas import UserCreate, UserLogin, Token, RefreshTokenRequest


def register_user(db: Session, user_in: UserCreate) -> User:
    """
    Register a new user.

    Args:
        db: Database session
        user_in: UserCreate schema object

    Returns:
        The created User object

    Raises:
        HTTPException: If the user already exists
    """
    # Check if the username or email already exists
    user = db.query(User).filter((User.email == user_in.email) | (User.username == user_in.username)).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email or username already exists"
        )

    # Create a new user
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        full_name=user_in.full_name,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def authenticate_user(db: Session, user_login: UserLogin) -> Token:
    """
    Authenticate a user and return a token.

    Args:
        db: Database session
        user_login: UserLogin schema object

    Returns:
        Token object containing JWT tokens

    Raises:
        HTTPException: If authentication fails
    """
    user = db.query(User).filter(User.username == user_login.username).first()

    if not user or not verify_password(user_login.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )

    # Create access and refresh tokens
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)
    refresh_token = create_refresh_token(subject=user.id, expires_delta=refresh_token_expires)

    return Token(access_token=access_token, refresh_token=refresh_token)


def refresh_access_token(db: Session, refresh_token_req: RefreshTokenRequest) -> str:
    """
    Refresh an access token using a valid refresh token.

    Args:
        db: Database session
        refresh_token_req: RefreshTokenRequest schema object

    Returns:
        New access token

    Raises:
        HTTPException: If the refresh token is invalid
    """
    # Decode the refresh token
    try:
        payload = decode_token(refresh_token_req.refresh_token)
        if payload['type'] != 'refresh':
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Create a new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.id, expires_delta=access_token_expires)

    return access_token


def get_current_user(db: Session, token: str = Depends(decode_token)) -> User:
    """
    Get the current authenticated user

    Args:
        db: Database session
        token: JWT token provided by the client

    Returns:
        User object

    Raises:
        HTTPException: If the token is invalid or user not found
    """
    # Decode the token
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if payload['type'] != 'access':
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )

    # Get the user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user
