"""
Comprehensive authentication models for WinCloud Builder
User, UserProvider, UserSession, and AuditLog models
"""

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import uuid

from app.core.database import Base


class User(Base):
    """
    Main user table with comprehensive authentication support
    """
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String(200), nullable=True)
    display_name = Column(String(100), nullable=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth-only accounts
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    
    # Provider information
    provider = Column(String(50), default="email", nullable=False)  # 'email', 'google', 'facebook', 'github'
    provider_user_id = Column(String(255), nullable=True)  # OAuth provider user ID
    
    # Role-based access control
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)  # Nullable for migration
    
    # Status fields
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)
    email_verified_at = Column(DateTime, nullable=True)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    droplets = relationship("Droplet", back_populates="owner", cascade="all, delete-orphan")
    providers = relationship("UserProvider", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"
    
    def to_dict(self):
        """Convert model to dictionary for serialization."""
        return {
            "id": str(self.id),
            "email": self.email,
            "username": self.username,
            "full_name": self.full_name,
            "display_name": self.display_name,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "provider": self.provider,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "is_superuser": self.is_superuser,
            "role": self.role.to_dict() if self.role else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }
    
    def is_admin(self) -> bool:
        """Check if user has admin role"""
        return self.role and self.role.name == "admin"
    
    def is_user(self) -> bool:
        """Check if user has user role"""
        return self.role and self.role.name == "user"
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has specific role"""
        return self.role and self.role.name.lower() == role_name.lower()
    
    def get_role_name(self) -> str:
        """Get user's role name"""
        return self.role.name if self.role else "unknown"


class UserProvider(Base):
    """
    Account linking table for multiple auth methods per user
    Allows users to link Google, Facebook, and local accounts
    """
    __tablename__ = "user_providers"

    id = Column(String(36), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # 'local', 'google', 'facebook'
    provider_id = Column(String(255), nullable=True)  # OAuth provider user ID
    provider_email = Column(String(255), nullable=True)  # Email from provider
    linked_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)  # Primary login method

    # Relationships
    user = relationship("User", back_populates="providers")

    def __repr__(self):
        return f"<UserProvider(user_id={self.user_id}, provider='{self.provider}', provider_id='{self.provider_id}')>"


class UserSession(Base):
    """
    Session management table for JWT token tracking and blacklisting
    """
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(255), unique=True, nullable=False, index=True)  # JWT ID for token tracking
    device_info = Column(Text, nullable=True)  # User agent, IP, etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<UserSession(id={self.id}, user_id={self.user_id}, jti='{self.jti[:8]}...', revoked={self.is_revoked})>"

    def is_expired(self):
        """Check if session is expired"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self):
        """Check if session is valid (not revoked and not expired)"""
        return not self.is_revoked and not self.is_expired()


class AuditLog(Base):
    """
    Audit logging for security events and user actions
    """
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(__import__('uuid').uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # 'login', 'logout', 'register', 'oauth_link', etc.
    resource = Column(String(100), nullable=True)  # What was accessed/modified
    details = Column(Text, nullable=True)  # Additional context (JSON string)
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(Text, nullable=True)  # Browser/client info
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', user_id={self.user_id})>"
