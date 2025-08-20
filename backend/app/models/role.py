#!/usr/bin/env python3
"""
Role Model for WinCloud Builder RBAC System
Defines user roles and permissions
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from app.core.database import Base


class Role(Base):
    """
    Role model for RBAC system
    Defines available roles in the system (admin, user, etc.)
    """
    __tablename__ = "roles"
    
    # Primary fields
    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(50), unique=True, nullable=False, index=True)  # "admin", "user"
    display_name = Column(String(100), nullable=False)  # "Administrator", "User"
    description = Column(Text, nullable=True)
    
    # Status and metadata
    is_active = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # System roles cannot be deleted
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="role", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Role(id='{self.id}', name='{self.name}', display_name='{self.display_name}')>"
    
    def to_dict(self):
        """Convert role to dictionary for API responses"""
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "is_active": self.is_active,
            "is_system": self.is_system,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def get_default_roles(cls):
        """Get the default system roles"""
        return [
            {
                "name": "admin",
                "display_name": "Administrator", 
                "description": "Full system access with user management capabilities",
                "is_system": True,
                "is_active": True
            },
            {
                "name": "user",
                "display_name": "User",
                "description": "Standard user with limited access to personal resources",
                "is_system": True, 
                "is_active": True
            }
        ]
    
    @classmethod
    def is_admin_role(cls, role_name: str) -> bool:
        """Check if a role name is admin"""
        return role_name.lower() == "admin"
    
    @classmethod
    def is_user_role(cls, role_name: str) -> bool:
        """Check if a role name is user"""
        return role_name.lower() == "user"
