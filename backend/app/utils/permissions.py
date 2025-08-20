"""
Permission utilities for WinCloud Builder RBAC System
Role-based access control helper functions
"""

from typing import List, Optional, Dict, Any
from functools import wraps
from fastapi import HTTPException, status
from app.models.auth_models import User
from app.models.role import Role
import logging

logger = logging.getLogger(__name__)


class PermissionError(Exception):
    """Custom permission error"""
    pass


class RolePermissions:
    """Define permissions for each role"""
    
    # Admin permissions
    ADMIN_PERMISSIONS = {
        "user_management": {
            "create_user": True,
            "read_user": True,
            "update_user": True,
            "delete_user": True,
            "change_user_role": True,
            "activate_deactivate_user": True,
            "view_all_users": True
        },
        "admin_management": {
            "create_admin": True,
            "view_admins": True,
            "manage_admin_permissions": True
        },
        "system_management": {
            "view_system_stats": True,
            "manage_tokens": True,
            "view_audit_logs": True,
            "access_all_droplets": True,
            "system_analytics": True
        },
        "droplet_management": {
            "view_all_droplets": True,
            "manage_any_droplet": True,
            "access_digitalocean_accounts": True
        }
    }
    
    # User permissions
    USER_PERMISSIONS = {
        "user_management": {
            "read_own_profile": True,
            "update_own_profile": True,
            "change_own_password": True
        },
        "droplet_management": {
            "view_own_droplets": True,
            "create_droplet": True,
            "manage_own_droplets": True
        },
        "analytics": {
            "view_own_analytics": True
        }
    }


def check_role_permission(user: User, permission_category: str, permission_name: str) -> bool:
    """
    Check if user has specific permission
    
    Args:
        user: User object with role
        permission_category: Category like 'user_management', 'system_management'
        permission_name: Specific permission like 'create_user', 'view_system_stats'
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    if not user or not user.role:
        logger.warning(f"Permission check failed: User or role is None")
        return False
    
    role_name = user.role.name.lower()
    
    # Get permissions based on role
    if role_name == "admin":
        permissions = RolePermissions.ADMIN_PERMISSIONS
    elif role_name == "user":
        permissions = RolePermissions.USER_PERMISSIONS
    else:
        logger.warning(f"Unknown role: {role_name}")
        return False
    
    # Check permission
    category_perms = permissions.get(permission_category, {})
    has_permission = category_perms.get(permission_name, False)
    
    logger.debug(f"Permission check: {user.email} ({role_name}) - {permission_category}.{permission_name} = {has_permission}")
    return has_permission


def require_permission(permission_category: str, permission_name: str):
    """
    Decorator to require specific permission for endpoint
    
    Usage:
        @require_permission("user_management", "create_user")
        def create_user_endpoint():
            pass
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get current user from kwargs (injected by FastAPI dependency)
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permission
            if not check_role_permission(current_user, permission_category, permission_name):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions: {permission_category}.{permission_name} required"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def is_admin(user: User) -> bool:
    """Check if user is admin"""
    # Fallback to is_superuser if role system not setup
    if hasattr(user, 'is_superuser') and user.is_superuser:
        return True
    return user and user.role and user.role.name.lower() == "admin"


def is_user(user: User) -> bool:
    """Check if user is regular user"""
    return user and user.role and user.role.name.lower() == "user"


def is_admin_or_self(user: User, target_user_id: str) -> bool:
    """Check if user is admin or accessing own data"""
    if is_admin(user):
        return True
    return str(user.id) == str(target_user_id)


def filter_user_data(user: User, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filter sensitive data based on user role
    
    Args:
        user: Current user
        data: Data to filter
        
    Returns:
        Filtered data based on user permissions
    """
    if is_admin(user):
        # Admins can see everything
        return data
    
    # Regular users see limited data
    sensitive_fields = [
        'is_superuser', 'role_id', 'provider_user_id', 
        'email_verified_at', 'do_api_token'
    ]
    
    filtered_data = {k: v for k, v in data.items() if k not in sensitive_fields}
    return filtered_data


def get_user_scope(user: User) -> Dict[str, Any]:
    """
    Get data access scope for user
    
    Returns:
        Dict with scope limitations
    """
    if is_admin(user):
        return {
            "can_access_all_users": True,
            "can_access_all_droplets": True,
            "can_access_system_data": True,
            "can_manage_roles": True,
            "user_id_filter": None  # No filter needed
        }
    
    return {
        "can_access_all_users": False,
        "can_access_all_droplets": False,
        "can_access_system_data": False,
        "can_manage_roles": False,
        "user_id_filter": str(user.id)  # Only own data
    }


def log_admin_action(user: User, action: str, resource: str, details: str = None):
    """
    Log admin actions for audit trail
    
    Args:
        user: User performing the action
        action: Action performed (create, update, delete, etc.)
        resource: Resource affected (user, droplet, etc.)
        details: Additional details
    """
    if is_admin(user):
        logger.info(f"ADMIN ACTION: {user.email} - {action} {resource}" + 
                   (f" - {details}" if details else ""))
    
    # TODO: Store in AuditLog table when needed


def validate_role_change(current_user: User, target_user: User, new_role: str) -> bool:
    """
    Validate if role change is allowed
    
    Args:
        current_user: User making the change
        target_user: User whose role is being changed
        new_role: New role to assign
        
    Returns:
        bool: True if change is allowed
    """
    # Only admins can change roles
    if not is_admin(current_user):
        return False
    
    # Cannot change own role (prevent lockout)
    if current_user.id == target_user.id:
        logger.warning(f"Admin {current_user.email} attempted to change own role")
        return False
    
    # Validate new role exists
    valid_roles = ["admin", "user"]
    if new_role.lower() not in valid_roles:
        return False
    
    return True


# Permission constants for easy reference
class Permissions:
    """Permission constants"""
    
    # User Management
    CREATE_USER = ("user_management", "create_user")
    READ_USER = ("user_management", "read_user")
    UPDATE_USER = ("user_management", "update_user")
    DELETE_USER = ("user_management", "delete_user")
    CHANGE_USER_ROLE = ("user_management", "change_user_role")
    VIEW_ALL_USERS = ("user_management", "view_all_users")
    
    # Admin Management
    CREATE_ADMIN = ("admin_management", "create_admin")
    VIEW_ADMINS = ("admin_management", "view_admins")
    
    # System Management
    VIEW_SYSTEM_STATS = ("system_management", "view_system_stats")
    MANAGE_TOKENS = ("system_management", "manage_tokens")
    VIEW_AUDIT_LOGS = ("system_management", "view_audit_logs")
    ACCESS_ALL_DROPLETS = ("system_management", "access_all_droplets")
    
    # Droplet Management
    VIEW_OWN_DROPLETS = ("droplet_management", "view_own_droplets")
    MANAGE_OWN_DROPLETS = ("droplet_management", "manage_own_droplets")
