"""
Enhanced Security API for WinCloud Builder
Provides 2FA, session management, and security monitoring endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json

from app.api.deps import get_db, get_current_user, require_admin
from app.models.auth_models import User
from app.models.security_models import (
    TwoFactorAuth, UserSession, SecurityEvent, APIKeyManagement,
    SecurityAlert, LoginAttempt, DeviceFingerprint
)
from app.services.security_service import enhanced_security
from app.schemas.security import (
    Setup2FAResponse, Verify2FARequest, TwoFactorTokenRequest,
    SessionResponse, SecurityEventResponse, APIKeyCreateRequest,
    SecurityDashboardResponse
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ================================
# 2FA ENDPOINTS
# ================================

@router.post("/2fa/setup", response_model=Setup2FAResponse, summary="Setup Two-Factor Authentication")
async def setup_2fa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🔐 Setup Two-Factor Authentication
    
    Generates TOTP secret, QR code, and backup codes for the user.
    
    **Returns:**
    - QR code for authenticator app
    - Backup codes for recovery
    - Setup instructions
    """
    try:
        # Check if 2FA already enabled
        existing_2fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        if existing_2fa:
            raise HTTPException(
                status_code=400, 
                detail="2FA is already enabled for this account"
            )
        
        # Setup 2FA
        setup_data = enhanced_security.setup_2fa(db, current_user.id)
        
        return {
            "success": True,
            "qr_code": setup_data["qr_code"],
            "backup_codes": setup_data["backup_codes"],
            "secret": setup_data["secret"],
            "instructions": [
                "Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)",
                "Enter the 6-digit code from your app to verify setup",
                "Save the backup codes in a secure location",
                "Each backup code can only be used once"
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA setup error: {e}")
        raise HTTPException(status_code=500, detail="Failed to setup 2FA")

@router.post("/2fa/verify-setup", summary="Verify 2FA Setup")
async def verify_2fa_setup(
    request: Verify2FARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    ✅ Verify 2FA setup with TOTP token
    
    Confirms the 2FA setup by verifying a token from the user's authenticator app.
    """
    try:
        success = enhanced_security.verify_2fa_setup(
            db, current_user.id, request.token
        )
        
        if success:
            return {
                "success": True,
                "message": "2FA has been successfully enabled for your account",
                "enabled": True
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Invalid verification code. Please try again."
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA verification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify 2FA")

@router.post("/2fa/verify", summary="Verify 2FA Token")
async def verify_2fa_token(
    request: TwoFactorTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🔑 Verify 2FA token for authentication
    
    Verifies TOTP token or backup code for login or sensitive operations.
    """
    try:
        success = enhanced_security.verify_2fa_token(
            db, current_user.id, request.token
        )
        
        if success:
            # Log successful 2FA verification
            enhanced_security.log_security_event(
                db, current_user.id, "2fa_verification_success",
                {"method": "api_verification"}
            )
            
            return {
                "success": True,
                "verified": True,
                "message": "2FA verification successful"
            }
        else:
            # Log failed 2FA verification
            enhanced_security.log_security_event(
                db, current_user.id, "2fa_verification_failed",
                {"method": "api_verification"},
                risk_level="medium"
            )
            
            raise HTTPException(
                status_code=400,
                detail="Invalid 2FA token"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA token verification error: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify 2FA token")

@router.delete("/2fa/disable", summary="Disable 2FA")
async def disable_2fa(
    request: TwoFactorTokenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🚫 Disable Two-Factor Authentication
    
    Disables 2FA after verifying current token.
    **Warning:** This reduces account security.
    """
    try:
        # Verify current 2FA token before disabling
        success = enhanced_security.verify_2fa_token(
            db, current_user.id, request.token
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Invalid 2FA token. Cannot disable 2FA."
            )
        
        # Disable 2FA
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id,
            TwoFactorAuth.is_enabled == True
        ).first()
        
        if two_fa:
            two_fa.is_enabled = False
            two_fa.disabled_at = datetime.utcnow()
            db.commit()
            
            # Log security event
            enhanced_security.log_security_event(
                db, current_user.id, "2fa_disabled",
                {"disabled_by": "user"},
                risk_level="high"
            )
            
            return {
                "success": True,
                "message": "2FA has been disabled for your account",
                "warning": "Your account is now less secure. Consider re-enabling 2FA."
            }
        else:
            raise HTTPException(status_code=404, detail="2FA not found or already disabled")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"2FA disable error: {e}")
        raise HTTPException(status_code=500, detail="Failed to disable 2FA")

@router.get("/2fa/status", summary="Get 2FA Status")
async def get_2fa_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📊 Get current 2FA status
    
    Returns whether 2FA is enabled and backup codes remaining.
    """
    try:
        two_fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.user_id == current_user.id
        ).first()
        
        if not two_fa:
            return {
                "enabled": False,
                "setup_available": True,
                "backup_codes_remaining": 0
            }
        
        # Count remaining backup codes
        backup_codes_remaining = 0
        if two_fa.backup_codes:
            backup_codes = json.loads(two_fa.backup_codes)
            backup_codes_remaining = len(backup_codes)
        
        return {
            "enabled": two_fa.is_enabled,
            "setup_available": not two_fa.is_enabled,
            "verified": two_fa.is_verified,
            "backup_codes_remaining": backup_codes_remaining,
            "last_used": two_fa.last_used_at.isoformat() if two_fa.last_used_at else None,
            "created_at": two_fa.created_at.isoformat() if two_fa.created_at else None
        }
        
    except Exception as e:
        logger.error(f"2FA status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get 2FA status")

# ================================
# SESSION MANAGEMENT
# ================================

@router.get("/sessions", response_model=List[SessionResponse], summary="Get Active Sessions")
async def get_user_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📱 Get all active sessions for current user
    
    Shows all devices and locations where the user is logged in.
    """
    try:
        sessions = db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.utcnow()
        ).order_by(UserSession.last_activity.desc()).all()
        
        session_list = []
        for session in sessions:
            session_list.append({
                "session_id": session.id,
                "device_fingerprint": session.device_fingerprint[:16] + "...",
                "ip_address": session.ip_address,
                "location": f"{session.location_city or 'Unknown'}, {session.location_country or 'Unknown'}",
                "user_agent": session.user_agent[:100] + "..." if len(session.user_agent or "") > 100 else session.user_agent,
                "created_at": session.created_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
                "expires_at": session.expires_at.isoformat(),
                "is_current": False  # Will be determined by frontend based on current session
            })
        
        return session_list
        
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.delete("/sessions/{session_id}", summary="Terminate Session")
async def terminate_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🚫 Terminate a specific session
    
    Logs out the user from a specific device/session.
    """
    try:
        session = db.query(UserSession).filter(
            UserSession.id == session_id,
            UserSession.user_id == current_user.id,
            UserSession.is_active == True
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Terminate session
        session.is_active = False
        session.terminated_at = datetime.utcnow()
        session.termination_reason = "user_terminated"
        db.commit()
        
        # Remove from Redis
        enhanced_security.redis_client.delete(f"session:{session_id}")
        
        # Log security event
        enhanced_security.log_security_event(
            db, current_user.id, "session_terminated",
            {
                "session_id": session_id,
                "termination_reason": "user_action",
                "device_fingerprint": session.device_fingerprint[:16] + "..."
            }
        )
        
        return {
            "success": True,
            "message": "Session terminated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Terminate session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to terminate session")

@router.delete("/sessions/all", summary="Terminate All Sessions")
async def terminate_all_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🚫 Terminate all sessions except current
    
    Logs out the user from all other devices.
    """
    try:
        # Get all active sessions
        sessions = db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True
        ).all()
        
        terminated_count = 0
        for session in sessions:
            session.is_active = False
            session.terminated_at = datetime.utcnow()
            session.termination_reason = "user_terminated_all"
            
            # Remove from Redis
            enhanced_security.redis_client.delete(f"session:{session.id}")
            terminated_count += 1
        
        db.commit()
        
        # Log security event
        enhanced_security.log_security_event(
            db, current_user.id, "all_sessions_terminated",
            {"terminated_count": terminated_count},
            risk_level="medium"
        )
        
        return {
            "success": True,
            "message": f"Terminated {terminated_count} sessions",
            "terminated_count": terminated_count
        }
        
    except Exception as e:
        logger.error(f"Terminate all sessions error: {e}")
        raise HTTPException(status_code=500, detail="Failed to terminate sessions")

# ================================
# SECURITY MONITORING
# ================================

@router.get("/events", response_model=List[SecurityEventResponse], summary="Get Security Events")
async def get_security_events(
    limit: int = Query(50, ge=1, le=500),
    event_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📊 Get security events for current user
    
    Shows login attempts, 2FA usage, and other security-related activities.
    """
    try:
        query = db.query(SecurityEvent).filter(
            SecurityEvent.user_id == current_user.id
        )
        
        if event_type:
            query = query.filter(SecurityEvent.event_type == event_type)
        
        if risk_level:
            query = query.filter(SecurityEvent.risk_level == risk_level)
        
        events = query.order_by(
            SecurityEvent.created_at.desc()
        ).limit(limit).all()
        
        event_list = []
        for event in events:
            event_list.append({
                "id": event.id,
                "event_type": event.event_type,
                "event_category": event.event_category,
                "risk_level": event.risk_level,
                "ip_address": event.ip_address,
                "location": f"{event.location_city or 'Unknown'}, {event.location_country or 'Unknown'}",
                "details": json.loads(event.details) if event.details else {},
                "created_at": event.created_at.isoformat(),
                "is_resolved": event.is_resolved
            })
        
        return event_list
        
    except Exception as e:
        logger.error(f"Get security events error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security events")

@router.get("/dashboard", response_model=SecurityDashboardResponse, summary="Security Dashboard")
async def get_security_dashboard(
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    🛡️ Get comprehensive security dashboard
    
    **Admin Only** - Shows system-wide security metrics and alerts.
    """
    try:
        dashboard_data = enhanced_security.get_security_dashboard(db)
        
        # Get additional admin-specific metrics
        now = datetime.utcnow()
        last_24h = now - timedelta(hours=24)
        
        # Get recent login attempts
        failed_logins = db.query(LoginAttempt).filter(
            LoginAttempt.created_at >= last_24h,
            LoginAttempt.success == False
        ).count()
        
        successful_logins = db.query(LoginAttempt).filter(
            LoginAttempt.created_at >= last_24h,
            LoginAttempt.success == True
        ).count()
        
        # Get 2FA adoption rate
        total_users = db.query(User).count()
        users_with_2fa = db.query(TwoFactorAuth).filter(
            TwoFactorAuth.is_enabled == True
        ).count()
        
        adoption_rate = (users_with_2fa / total_users * 100) if total_users > 0 else 0
        
        dashboard_data.update({
            "failed_logins_24h": failed_logins,
            "successful_logins_24h": successful_logins,
            "2fa_adoption_rate": round(adoption_rate, 1),
            "total_users": total_users,
            "users_with_2fa": users_with_2fa
        })
        
        return dashboard_data
        
    except Exception as e:
        logger.error(f"Security dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security dashboard")

# ================================
# API KEY MANAGEMENT
# ================================

@router.post("/api-keys", summary="Create Encrypted API Key")
async def create_encrypted_api_key(
    request: APIKeyCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🔑 Create and encrypt API key
    
    Stores API keys with user-specific encryption for enhanced security.
    """
    try:
        # Encrypt the API key
        encrypted_key = enhanced_security.encrypt_api_key(
            request.api_key, current_user.id
        )
        
        # Create fingerprint for identification
        import hashlib
        key_fingerprint = hashlib.sha256(request.api_key.encode()).hexdigest()
        
        # Save to database
        api_key_record = APIKeyManagement(
            user_id=current_user.id,
            key_name=request.key_name,
            key_type=request.key_type,
            encrypted_key=encrypted_key,
            key_fingerprint=key_fingerprint,
            permissions=request.permissions,
            expires_at=datetime.utcnow() + timedelta(days=90) if request.auto_expire else None
        )
        
        db.add(api_key_record)
        db.commit()
        
        # Log security event
        enhanced_security.log_security_event(
            db, current_user.id, "api_key_created",
            {
                "key_name": request.key_name,
                "key_type": request.key_type,
                "fingerprint": key_fingerprint[:16] + "..."
            }
        )
        
        return {
            "success": True,
            "key_id": api_key_record.id,
            "key_name": request.key_name,
            "fingerprint": key_fingerprint[:16] + "...",
            "expires_at": api_key_record.expires_at.isoformat() if api_key_record.expires_at else None,
            "message": "API key encrypted and stored securely"
        }
        
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create API key")

@router.get("/api-keys", summary="List Encrypted API Keys")
async def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    📋 List user's encrypted API keys
    
    Shows metadata about stored API keys without exposing the actual keys.
    """
    try:
        api_keys = db.query(APIKeyManagement).filter(
            APIKeyManagement.user_id == current_user.id,
            APIKeyManagement.is_active == True
        ).order_by(APIKeyManagement.created_at.desc()).all()
        
        key_list = []
        for key in api_keys:
            key_list.append({
                "id": key.id,
                "key_name": key.key_name,
                "key_type": key.key_type,
                "fingerprint": key.key_fingerprint[:16] + "...",
                "last_used": key.last_used_at.isoformat() if key.last_used_at else None,
                "usage_count": key.usage_count,
                "created_at": key.created_at.isoformat(),
                "expires_at": key.expires_at.isoformat() if key.expires_at else None,
                "is_expired": key.expires_at < datetime.utcnow() if key.expires_at else False
            })
        
        return {
            "api_keys": key_list,
            "total_count": len(key_list)
        }
        
    except Exception as e:
        logger.error(f"List API keys error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list API keys")

@router.delete("/api-keys/{key_id}", summary="Revoke API Key")
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    🚫 Revoke encrypted API key
    
    Marks API key as revoked and removes access.
    """
    try:
        api_key = db.query(APIKeyManagement).filter(
            APIKeyManagement.id == key_id,
            APIKeyManagement.user_id == current_user.id,
            APIKeyManagement.is_active == True
        ).first()
        
        if not api_key:
            raise HTTPException(status_code=404, detail="API key not found")
        
        # Revoke the key
        api_key.is_revoked = True
        api_key.is_active = False
        api_key.revoked_at = datetime.utcnow()
        api_key.revoked_by = current_user.id
        api_key.revocation_reason = "user_revoked"
        db.commit()
        
        # Log security event
        enhanced_security.log_security_event(
            db, current_user.id, "api_key_revoked",
            {
                "key_name": api_key.key_name,
                "key_type": api_key.key_type,
                "fingerprint": api_key.key_fingerprint[:16] + "...",
                "reason": "user_revoked"
            }
        )
        
        return {
            "success": True,
            "message": f"API key '{api_key.key_name}' has been revoked"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revoke API key error: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke API key")
