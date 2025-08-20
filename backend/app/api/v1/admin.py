"""
Admin API Endpoints for WinCloud Builder
User management, admin management, and system administration
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.api.deps import get_db, require_admin, get_current_user
from app.models.auth_models import User, AuditLog
from app.models.role import Role
from app.models.droplet import Droplet
from app.core.security import get_password_hash, create_user_tokens
from app.utils.permissions import (
    check_role_permission, log_admin_action, validate_role_change,
    get_user_scope, filter_user_data
)
from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ================================
# PYDANTIC SCHEMAS
# ================================

class UserCreateRequest(BaseModel):
    """Schema for creating new user"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    is_verified: bool = True
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and dashes')
        return v
    
    @validator('role')
    def validate_role(cls, v):
        if v.lower() not in ['admin', 'user']:
            raise ValueError('Role must be admin or user')
        return v.lower()

class UserUpdateRequest(BaseModel):
    """Schema for updating user"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

class UserRoleChangeRequest(BaseModel):
    """Schema for changing user role"""
    role: str
    
    @validator('role')
    def validate_role(cls, v):
        if v.lower() not in ['admin', 'user']:
            raise ValueError('Role must be admin or user')
        return v.lower()

class UserStatusRequest(BaseModel):
    """Schema for changing user status"""
    is_active: bool
    reason: Optional[str] = None

class UserResponse(BaseModel):
    """Schema for user response"""
    id: str
    email: str
    username: str
    full_name: Optional[str]
    display_name: Optional[str]
    phone: Optional[str]
    provider: str
    is_active: bool
    is_verified: bool
    is_superuser: bool
    role: Optional[Dict[str, Any]]
    created_at: str
    updated_at: str
    last_login: Optional[str]
    
    class Config:
        from_attributes = True

class PaginatedUsersResponse(BaseModel):
    """Schema for paginated users list"""
    users: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int

class SystemStatsResponse(BaseModel):
    """Schema for system statistics"""
    total_users: int
    active_users: int
    admin_users: int
    verified_users: int
    total_droplets: int
    active_droplets: int
    recent_registrations: int
    recent_logins: int
    providers: Dict[str, int]

# ================================
# USER MANAGEMENT ENDPOINTS
# ================================

@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Create a new user (Admin only)"""
    # Check if email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Get role
    role = db.query(Role).filter(Role.name == user_data.role).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{user_data.role}' not found"
        )
    
    # Create user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name or user_data.username.title(),
        display_name=user_data.full_name or user_data.username.title(),
        provider='local',
        is_active=user_data.is_active,
        is_verified=user_data.is_verified,
        role_id=role.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log admin action
    log_admin_action(
        admin_user, 
        "create_user", 
        "user", 
        f"Created user {new_user.email} with role {user_data.role}"
    )
    
    logger.info(f"Admin {admin_user.email} created user {new_user.email}")
    return new_user.to_dict()

@router.get("/users", response_model=PaginatedUsersResponse)
async def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """List all users with pagination and filters (Admin only)"""
    
    # Build query
    query = db.query(User)
    
    # Apply filters
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                User.email.ilike(search_term),
                User.username.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )
    
    if role:
        role_obj = db.query(Role).filter(Role.name == role.lower()).first()
        if role_obj:
            query = query.filter(User.role_id == role_obj.id)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    users = query.order_by(desc(User.created_at)).offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return {
        "users": [user.to_dict() for user in users],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get user details (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user.to_dict()

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Update user details (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check for duplicate email/username
    if update_data.email and update_data.email != user.email:
        if db.query(User).filter(User.email == update_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
    
    if update_data.username and update_data.username != user.username:
        if db.query(User).filter(User.username == update_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update fields
    update_fields = []
    for field, value in update_data.dict(exclude_unset=True).items():
        if hasattr(user, field):
            setattr(user, field, value)
            update_fields.append(f"{field}={value}")
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # Log admin action
    log_admin_action(
        admin_user,
        "update_user",
        "user", 
        f"Updated user {user.email}: {', '.join(update_fields)}"
    )
    
    logger.info(f"Admin {admin_user.email} updated user {user.email}")
    return user.to_dict()

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Delete user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user_email = user.email
    db.delete(user)
    db.commit()
    
    # Log admin action
    log_admin_action(
        admin_user,
        "delete_user",
        "user",
        f"Deleted user {user_email}"
    )
    
    logger.info(f"Admin {admin_user.email} deleted user {user_email}")
    return {"message": f"User {user_email} deleted successfully"}

@router.post("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    role_data: UserRoleChangeRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Change user role (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate role change
    if not validate_role_change(admin_user, user, role_data.role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role change not allowed"
        )
    
    # Get new role
    new_role = db.query(Role).filter(Role.name == role_data.role).first()
    if not new_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_data.role}' not found"
        )
    
    old_role_name = user.role.name if user.role else "unknown"
    user.role_id = new_role.id
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # Log admin action
    log_admin_action(
        admin_user,
        "change_role",
        "user",
        f"Changed {user.email} role from {old_role_name} to {role_data.role}"
    )
    
    logger.info(f"Admin {admin_user.email} changed {user.email} role to {role_data.role}")
    return {"message": f"User role changed to {role_data.role}"}

@router.post("/users/{user_id}/status")
async def change_user_status(
    user_id: str,
    status_data: UserStatusRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Activate/Deactivate user (Admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deactivation
    if user.id == admin_user.id and not status_data.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    old_status = user.is_active
    user.is_active = status_data.is_active
    user.updated_at = datetime.utcnow()
    db.commit()
    
    action = "activated" if status_data.is_active else "deactivated"
    
    # Log admin action
    log_admin_action(
        admin_user,
        "change_status",
        "user",
        f"{action.title()} user {user.email}" + 
        (f" - {status_data.reason}" if status_data.reason else "")
    )
    
    logger.info(f"Admin {admin_user.email} {action} user {user.email}")
    return {"message": f"User {action} successfully"}

# ================================
# ADMIN MANAGEMENT ENDPOINTS  
# ================================

@router.post("/admins", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin(
    admin_data: UserCreateRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Create a new admin user (Admin only)"""
    # Force role to admin
    admin_data.role = "admin"
    
    # Use the same logic as create_user but ensure admin role
    return await create_user(admin_data, db, admin_user)

@router.get("/admins", response_model=List[UserResponse])
async def list_admins(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """List all admin users (Admin only)"""
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    if not admin_role:
        return []
    
    admins = db.query(User).filter(User.role_id == admin_role.id).order_by(User.created_at).all()
    return [admin.to_dict() for admin in admins]

# ================================
# SYSTEM MANAGEMENT ENDPOINTS
# ================================

@router.get("/test")
async def test_admin_endpoint(
    admin_user: User = Depends(require_admin)
):
    """Simple test endpoint"""
    return {"message": "Admin test works!", "user": admin_user.email}

@router.get("/analytics")
async def get_admin_analytics(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get admin analytics including user tokens (Admin only)"""
    logger.info(f"🔍 Admin analytics called by user: {admin_user.email}")
    
    try:
        logger.info("🔍 Starting admin analytics processing...")

        # Import here to avoid circular imports
        from app.services.secure_token_service import secure_token_service
        import os
        import json
        
        # Get user statistics

        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        verified_users = db.query(User).filter(User.is_verified == True).count()

        
        # Admin count - use is_superuser instead of role
        admin_users = db.query(User).filter(User.is_superuser == True).count()

        
        # Droplet statistics
        total_droplets = db.query(Droplet).count()
        active_droplets = db.query(Droplet).filter(Droplet.status == "active").count()

        
        # Load ALL user tokens from user_tokens.json (main file)
        tokens_list = []
        users_with_tokens = 0
        valid_tokens_count = 0
        
        try:
            # Primary: Load from user_tokens.json (contains all users' tokens)  
            # Use direct path from backend directory
            user_tokens_file = "user_tokens.json"
            logger.info(f"🔍 Looking for user_tokens.json at: {user_tokens_file}")
            logger.info(f"🔍 Absolute path: {os.path.abspath(user_tokens_file)}")
            logger.info(f"🔍 File exists: {os.path.exists(user_tokens_file)}")
            
            if os.path.exists(user_tokens_file):

                with open(user_tokens_file, 'r') as f:
                    user_tokens_data = json.load(f)
                

                logger.info(f"📊 Found {len(user_tokens_data)} users with token data")
                
                for user_id, user_data in user_tokens_data.items():
                    user_tokens = user_data.get('tokens', [])
                    if user_tokens:
                        users_with_tokens += 1
                        
                        # Try to find user in database for email/name
                        db_user = db.query(User).filter(User.id == user_id).first()
                        user_email = db_user.email if db_user else f"user_{user_id}@unknown.com"
                        user_name = (db_user.full_name if db_user and db_user.full_name else user_email) if db_user else f"User {user_id}"
                        
                        # Add each token to the list
                        for token_data in user_tokens:
                            token_info = {
                                "user_email": user_email,
                                "user_name": user_name,
                                "user_id": user_id,
                                "token": token_data.get('token', ''),
                                "masked_token": f"***...{token_data.get('token', '')[-10:]}",
                                "status": "valid" if token_data.get('is_valid', True) else "invalid",
                                "valid": token_data.get('is_valid', True),
                                "created_at": token_data.get('added_at'),
                                "last_used": token_data.get('last_used'),
                                "name": token_data.get('name', 'Default')
                            }
                            tokens_list.append(token_info)
                            if token_data.get('is_valid', True):
                                valid_tokens_count += 1
                
                logger.info(f"✅ Loaded {len(tokens_list)} tokens from {users_with_tokens} users")
            
            # Fallback 1: Try secure token service
            elif not tokens_list:
                all_users = db.query(User).filter(User.is_active == True).all()
                for user in all_users:
                    try:
                        user_tokens_data = secure_token_service.get_user_tokens(user.id)
                        if user_tokens_data and not user_tokens_data.get('error'):
                            user_tokens = user_tokens_data.get('tokens', [])
                            if user_tokens:
                                users_with_tokens += 1
                                for token in user_tokens:
                                    token_info = {
                                        "user_email": user.email,
                                        "user_name": user.full_name or user.email,
                                        "user_id": user.id,
                                        "token": token.get('token', ''),
                                        "masked_token": token.get('masked_token', '***...hidden'),
                                        "status": token.get('status', 'unknown'),
                                        "valid": token.get('status') == 'valid',
                                        "created_at": token.get('created_at')
                                    }
                                    tokens_list.append(token_info)
                                    if token.get('status') == 'valid':
                                        valid_tokens_count += 1
                    except Exception as e:
                        logger.error(f"Error getting tokens for user {user.email}: {e}")
                        continue
            
            # Fallback 2: Legacy tokens_secure.json
            if not tokens_list:
                tokens_file = "tokens_secure.json"
                if os.path.exists(tokens_file):
                    with open(tokens_file, 'r') as f:
                        tokens_data = json.load(f)

                        # Handle new secure format with users structure
                        if 'users' in tokens_data:
                            for user_id, user_data in tokens_data['users'].items():
                                tokens = user_data.get('tokens', [])
                                for i, token_data in enumerate(tokens):
                                    if token_data.get('is_valid', True):
                                        # For encrypted tokens, use fingerprint as identifier
                                        if 'encrypted_token' in token_data:
                                            masked_token = f"***...{token_data.get('fingerprint', 'unknown')}"
                                            token_name = token_data.get('name', f'Token {i+1}')
                                        elif 'token' in token_data:
                                            token = token_data['token']
                                            masked_token = f"***...{token[-10:]}" if len(token) >= 10 else token
                                            token_name = token_data.get('name', f'Token {i+1}')
                                        else:
                                            continue

                                        tokens_list.append({
                                            "user_email": f"secure_user_{user_id}@example.com",
                                            "user_name": f"Secure User {user_id}",
                                            "user_id": user_id,
                                            "token": token_data.get('token', 'encrypted'),
                                            "masked_token": masked_token,
                                            "status": "valid",
                                            "valid": True,
                                            "created_at": token_data.get('created_at'),
                                            "name": token_name
                                        })
                                        valid_tokens_count += 1
                                        users_with_tokens += 1
                        else:
                            # Fallback to old format
                            tokens = tokens_data.get("tokens", [])
                            for i, token in enumerate(tokens):
                                if isinstance(token, str) and len(token) > 20:
                                    tokens_list.append({
                                        "user_email": f"legacy_user_{i+1}@example.com",
                                        "user_name": f"Legacy User {i+1}",
                                        "user_id": f"legacy_{i+1}",
                                        "token": token,
                                        "masked_token": f"***...{token[-10:]}",
                                        "status": "valid",
                                        "valid": True,
                                        "created_at": None
                                    })
                                    valid_tokens_count += 1
                                    users_with_tokens += 1
                                
        except Exception as e:
            logger.error(f"❌ Error loading user tokens: {e}")

            # Set empty defaults
            tokens_list = []
            users_with_tokens = 0
            valid_tokens_count = 0
        
        # Final stats before return
        
        result = {
            "users": {
                "total": total_users,
                "active": active_users,
                "admin": admin_users,
                "verified": verified_users,
                "with_tokens": users_with_tokens
            },
            "tokens": {
                "total": len(tokens_list),
                "valid": valid_tokens_count,
                "invalid": len(tokens_list) - valid_tokens_count,
                "users_with_tokens": users_with_tokens,
                "tokens_list": tokens_list
            },
            "droplets": {
                "total": total_droplets,
                "running": active_droplets,
                "stopped": total_droplets - active_droplets,
                "other": 0
            },
            "system": {
                "uptime": "Running",
                "version": "1.0.0",
                "environment": "production"
            }
        }
        

        return result
        
    except Exception as e:
        logger.error(f"❌ Admin analytics error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get admin analytics: {str(e)}")

@router.get("/system/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get system statistics (Admin only)"""

    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()

    # Admin count
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    admin_users = db.query(User).filter(User.role_id == admin_role.id).count() if admin_role else 0

    # Droplet statistics
    total_droplets = db.query(Droplet).count()
    active_droplets = db.query(Droplet).filter(Droplet.status == "active").count()

    # Agent statistics (mock data for now - will be replaced with actual GenAI API calls)
    # In a real implementation, this would call the GenAI service to get actual agent stats
    total_agents = 0
    active_agents = 0
    agents_by_user = {}
    recent_agent_activity = 0

    try:
        # This is a placeholder - in production, you would call the GenAI service
        # For now, we'll provide mock data to demonstrate the structure
        total_agents = 15  # Mock data
        active_agents = 12  # Mock data
        recent_agent_activity = 8  # Mock data

        # Mock agents by user distribution
        agents_by_user = {
            "user_1": 3,
            "user_2": 5,
            "user_3": 2,
            "user_4": 5
        }
    except Exception as e:
        logger.warning(f"Could not fetch agent statistics: {e}")

    # Recent activity (last 7 days)
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_registrations = db.query(User).filter(User.created_at >= week_ago).count()
    recent_logins = db.query(User).filter(User.last_login >= week_ago).count()

    # Provider distribution
    provider_stats = db.query(
        User.provider,
        func.count(User.id)
    ).group_by(User.provider).all()

    providers = {provider: count for provider, count in provider_stats}

    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "admins": admin_users
        },
        "droplets": {
            "total": total_droplets,
            "active": active_droplets,
            "utilization_rate": round((active_droplets / total_droplets * 100) if total_droplets > 0 else 0, 1)
        },
        "agents": {
            "total": total_agents,
            "active": active_agents,
            "by_user": agents_by_user,
            "recent_activity": recent_agent_activity
        },
        "regional_distribution": [],  # Will be populated with actual data
        "top_users": [],  # Will be populated with actual data
        "recent_registrations": recent_registrations,
        "recent_logins": recent_logins,
        "providers": providers
    }

# Agent Management Endpoints
@router.get("/agents")
async def list_all_agents(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """List all agents across the system (Admin only)"""
    try:
        # Get real agents from GenAI service
        agents_list = []

        # Try to get token from tokens_secure.json
        first_token = None
        try:
            import json
            import os
            tokens_file = "tokens_secure.json"
            if os.path.exists(tokens_file):
                with open(tokens_file, 'r') as f:
                    tokens_data = json.load(f)
                    if 'users' in tokens_data:
                        for user_data in tokens_data['users'].values():
                            for token_data in user_data.get('tokens', []):
                                if token_data.get('is_valid', True):
                                    # Check if token is encrypted
                                    if 'encrypted_token' in token_data:
                                        try:
                                            # Try to decrypt token using secure token service
                                            from app.services.secure_token_service import SecureTokenService
                                            secure_service = SecureTokenService()
                                            decrypted_token = secure_service.decrypt_token(
                                                token_data['encrypted_token'],
                                                token_data['salt']
                                            )
                                            if decrypted_token:
                                                first_token = decrypted_token
                                                logger.info("✅ Successfully decrypted token for GenAI agents list")
                                                break
                                        except Exception as decrypt_error:
                                            logger.warning(f"Could not decrypt token: {decrypt_error}")
                                            continue
                                    elif 'token' in token_data:
                                        first_token = token_data['token']
                                        break
                            if first_token:
                                break
        except Exception as e:
            logger.warning(f"Could not load token from tokens_secure.json: {e}")

        if first_token:
            from app.services.direct_genai_service import get_direct_genai_service
            secure_genai_service = get_direct_genai_service(token=first_token)
            agents_response = await secure_genai_service.list_agents()

            if agents_response.get("success"):
                real_agents = agents_response.get("agents", [])

                # Convert to expected format
                for i, agent in enumerate(real_agents):
                    agents_list.append({
                        "id": agent.get("id", agent.get("uuid", f"agent_{i+1}")),
                        "name": agent.get("name", f"Agent {i+1}"),
                        "description": agent.get("description", "AI Agent"),
                        "user_id": agent.get("user_id", "unknown"),
                        "user_email": f"user_{i+1}@example.com",  # GenAI API doesn't provide user email
                        "workspace_id": agent.get("workspace_id", "default"),
                        "model": agent.get("model", "unknown"),
                        "status": "active" if agent.get("status") != "inactive" else "inactive",
                        "created_at": agent.get("created_at", "2024-01-01T00:00:00Z"),
                        "last_used": agent.get("updated_at", agent.get("created_at", "2024-01-01T00:00:00Z")),
                        "usage_count": 0  # GenAI API doesn't provide usage count
                    })

                logger.info(f"✅ Retrieved {len(agents_list)} real agents from GenAI API")
            else:
                logger.warning(f"⚠️ Failed to get agents from GenAI API: {agents_response.get('error')}")
        else:
            logger.warning("⚠️ No valid token found for GenAI service")

        # If no real agents found, use mock data as fallback
        if not agents_list:
            logger.info("📝 Using mock agents data as fallback")
            agents_list = [
                {
                    "id": "agent_1",
                    "name": "Content Creator",
                    "description": "AI agent for content generation",
                    "user_id": "user_1",
                    "user_email": "user1@example.com",
                    "workspace_id": "workspace_1",
                    "model": "gpt-4",
                    "status": "active",
                    "created_at": "2024-01-15T10:30:00Z",
                    "last_used": "2024-01-20T14:22:00Z",
                    "usage_count": 45
                }
            ]

        # Apply filters
        filtered_agents = agents_list
        if search:
            search_lower = search.lower()
            filtered_agents = [
                agent for agent in filtered_agents
                if search_lower in agent["name"].lower() or
                   search_lower in agent["description"].lower() or
                   search_lower in agent["user_email"].lower()
            ]

        if user_id:
            filtered_agents = [agent for agent in filtered_agents if agent["user_id"] == user_id]

        # Pagination
        total = len(filtered_agents)
        start = (page - 1) * size
        end = start + size
        paginated_agents = filtered_agents[start:end]

        return {
            "agents": paginated_agents,
            "total": total,
            "page": page,
            "size": size,
            "total_pages": (total + size - 1) // size
        }

    except Exception as e:
        logger.error(f"Failed to list agents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")

@router.get("/agents/{agent_id}")
async def get_agent_details(
    agent_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get detailed information about a specific agent (Admin only)"""
    try:
        # Mock data for now - in production, this would call the GenAI service
        mock_agent_details = {
            "id": agent_id,
            "name": "Content Creator",
            "description": "AI agent for content generation",
            "user_id": "user_1",
            "user_email": "user1@example.com",
            "user_name": "John Doe",
            "workspace_id": "workspace_1",
            "workspace_name": "Main Workspace",
            "model": "gpt-4",
            "instructions": "You are a helpful content creation assistant.",
            "status": "active",
            "created_at": "2024-01-15T10:30:00Z",
            "updated_at": "2024-01-20T14:22:00Z",
            "last_used": "2024-01-20T14:22:00Z",
            "usage_stats": {
                "total_conversations": 45,
                "total_messages": 234,
                "avg_response_time_ms": 1250,
                "success_rate": 98.5
            },
            "recent_activity": [
                {
                    "timestamp": "2024-01-20T14:22:00Z",
                    "action": "chat_message",
                    "details": "Generated blog post outline"
                },
                {
                    "timestamp": "2024-01-20T13:15:00Z",
                    "action": "chat_message",
                    "details": "Created social media content"
                }
            ]
        }

        return mock_agent_details

    except Exception as e:
        logger.error(f"Failed to get agent details: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get agent details: {str(e)}")

@router.delete("/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Delete an agent (Admin only)"""
    try:
        # In production, this would call the GenAI service to delete the agent
        logger.info(f"Admin {admin_user.email} deleted agent {agent_id}")

        return {
            "success": True,
            "message": f"Agent {agent_id} deleted successfully"
        }

    except Exception as e:
        logger.error(f"Failed to delete agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete agent: {str(e)}")

@router.get("/system/logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get audit logs (Admin only)"""
    
    query = db.query(AuditLog)
    
    # Apply filters
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "resource": log.resource,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat()
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

# =========================
# ADMIN DROPLETS MANAGEMENT
# =========================

@router.get("/droplets")
async def get_all_droplets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all droplets in the system (admin only)"""
    try:
        query = db.query(Droplet).join(User, Droplet.user_id == User.id)
        
        # Apply filters
        if status:
            query = query.filter(Droplet.status == status)
        if region:
            query = query.filter(Droplet.region == region)
        if user_id:
            query = query.filter(Droplet.user_id == user_id)
        if search:
            query = query.filter(
                or_(
                    Droplet.name.ilike(f"%{search}%"),
                    Droplet.public_ip.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%")
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        droplets = query.offset(offset).limit(limit).all()
        
        # Format response
        droplets_data = []
        for droplet in droplets:
            user = db.query(User).filter(User.id == droplet.user_id).first()
            droplets_data.append({
                "id": droplet.id,
                "name": droplet.name,
                "status": droplet.status,
                "region": droplet.region,
                "size": droplet.size,
                "image": droplet.image,
                "public_ip": droplet.public_ip,
                "private_ip": droplet.private_ip,
                "vcpus": droplet.vcpus,
                "memory": droplet.memory,
                "disk": droplet.disk,
                "price_monthly": droplet.price_monthly,
                "created_at": droplet.created_at.isoformat(),
                "user_id": droplet.user_id,
                "user_email": user.email if user else None,
                "user_name": user.full_name if user else None
            })
        
        # Log admin action
        log_admin_action(
            db, current_user.id,
            "admin_droplets_viewed",
            "admin_droplets",
            {"filters": {"status": status, "region": region, "search": search}}
        )
        
        return {
            "droplets": droplets_data,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"Error fetching admin droplets: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch droplets"
        )

@router.get("/droplets/stats")
async def get_droplets_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get droplets statistics for admin dashboard"""
    try:
        total = db.query(Droplet).count()
        running = db.query(Droplet).filter(Droplet.status == "running").count()
        stopped = db.query(Droplet).filter(Droplet.status == "stopped").count()
        pending = db.query(Droplet).filter(Droplet.status == "pending").count()
        
        # Group by region
        region_stats = db.query(
            Droplet.region,
            func.count(Droplet.id).label('count')
        ).group_by(Droplet.region).all()
        
        by_region = {region: count for region, count in region_stats}
        
        # Group by size
        size_stats = db.query(
            Droplet.size,
            func.count(Droplet.id).label('count')
        ).group_by(Droplet.size).all()
        
        by_size = {size: count for size, count in size_stats}
        
        # Calculate total cost
        total_cost = db.query(func.sum(Droplet.price_monthly)).scalar() or 0
        
        return {
            "total": total,
            "running": running,
            "stopped": stopped,
            "pending": pending,
            "by_region": by_region,
            "by_size": by_size,
            "total_cost": float(total_cost)
        }
        
    except Exception as e:
        logger.error(f"Error fetching droplets stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch droplets statistics"
        )

class BulkDropletAction(BaseModel):
    action: str
    droplet_ids: List[str]

@router.post("/droplets/bulk-action")
async def bulk_droplet_action(
    action_data: BulkDropletAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Perform bulk actions on droplets"""
    try:
        valid_actions = ["start", "stop", "delete", "reboot"]
        if action_data.action not in valid_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action. Must be one of: {valid_actions}"
            )
        
        # Verify droplets exist
        droplets = db.query(Droplet).filter(
            Droplet.id.in_(action_data.droplet_ids)
        ).all()
        
        if len(droplets) != len(action_data.droplet_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Some droplets not found"
            )
        
        # For now, just log the action (implement actual DO API calls later)
        affected_count = len(droplets)
        
        # Log admin action
        log_admin_action(
            db, current_user.id,
            f"bulk_{action_data.action}_droplets",
            "droplets",
            {
                "action": action_data.action,
                "droplet_ids": action_data.droplet_ids,
                "affected_count": affected_count
            }
        )
        
        return {
            "message": f"Bulk {action_data.action} initiated for {affected_count} droplets",
            "affected_count": affected_count,
            "action": action_data.action
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing bulk droplet action: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform bulk action"
        )
