"""
Secure Token API - Enhanced token management with encryption
Provides secure token storage, transmission, and management
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.auth_models import User
from app.services.secure_token_service import secure_token_service
from app.middleware.security_middleware import TokenSecurityValidator

logger = logging.getLogger(__name__)
router = APIRouter()

# ================================
# SCHEMAS
# ================================

class TokenCreateRequest(BaseModel):
    tokens: List[str]
    token_type: str = "digitalocean"
    auto_encrypt: bool = True

class TokenSessionRequest(BaseModel):
    token_index: int = 0
    duration_hours: int = 1

class SecureTokenResponse(BaseModel):
    success: bool
    message: str
    token_count: int
    encrypted: bool
    fingerprints: List[str]

class TokenSessionResponse(BaseModel):
    success: bool
    session_token: str
    expires_at: str
    security_level: str

class TokenAuditResponse(BaseModel):
    user_id: str
    total_tokens: int
    last_updated: Optional[str]
    tokens: List[Dict[str, Any]]
    security_events: List[Dict[str, Any]]

# ================================
# SECURE TOKEN ENDPOINTS
# ================================

@router.post("/tokens/encrypt", response_model=SecureTokenResponse, summary="Encrypt and Store Tokens")
async def encrypt_and_store_tokens(
    request: TokenCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    🔐 Encrypt and securely store user tokens
    
    Replaces plaintext token storage with encrypted, user-specific storage.
    """
    try:
        # Validate tokens before encryption
        valid_tokens = []
        fingerprints = []
        
        for token in request.tokens:
            if not token or not token.strip():
                continue
                
            # Validate DO token format if specified
            if request.token_type == "digitalocean":
                validation = TokenSecurityValidator.validate_do_token(token.strip())
                if not validation["valid"]:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid token format: {validation['error']}"
                    )
            
            valid_tokens.append(token.strip())
            
            # Generate fingerprint for tracking
            import hashlib
            fingerprint = hashlib.sha256(token.encode()).hexdigest()[:16]
            fingerprints.append(fingerprint)
        
        if not valid_tokens:
            raise HTTPException(status_code=400, detail="No valid tokens provided")
        
        # Encrypt and store tokens
        success = secure_token_service.save_encrypted_tokens(
            current_user.id, valid_tokens
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to encrypt and store tokens")
        
        # Log security event
        logger.info(
            f"🔐 User {current_user.id} encrypted {len(valid_tokens)} tokens of type {request.token_type}"
        )
        
        return SecureTokenResponse(
            success=True,
            message=f"Successfully encrypted and stored {len(valid_tokens)} tokens",
            token_count=len(valid_tokens),
            encrypted=True,
            fingerprints=fingerprints
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token encryption error: {e}")
        raise HTTPException(status_code=500, detail="Failed to encrypt tokens")

@router.get("/tokens/session", response_model=TokenSessionResponse, summary="Create Secure Token Session")
async def create_token_session(
    token_index: int = 0,
    duration_hours: int = 1,
    current_user: User = Depends(get_current_user)
):
    """
    🎫 Create secure token session for temporary access
    
    Returns encrypted session token that can be used to access actual DO tokens.
    """
    try:
        # Validate parameters
        if duration_hours > 24:
            raise HTTPException(status_code=400, detail="Session duration cannot exceed 24 hours")
        
        if token_index < 0:
            raise HTTPException(status_code=400, detail="Token index must be non-negative")
        
        # Create secure session
        session_token = secure_token_service.create_secure_token_session(
            current_user.id, token_index
        )
        
        if not session_token:
            raise HTTPException(status_code=404, detail="No tokens found or invalid token index")
        
        # Calculate expiration
        from datetime import timedelta
        expires_at = (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat()
        
        logger.info(f"🎫 Created secure session for user {current_user.id}, token index {token_index}")
        
        return TokenSessionResponse(
            success=True,
            session_token=session_token,
            expires_at=expires_at,
            security_level="AES-256"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Session creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create token session")

@router.post("/tokens/validate-session", summary="Validate and Use Token Session")
async def validate_token_session(
    session_token: str,
    request: Request
):
    """
    ✅ Validate session token and return actual DO token
    
    Used internally by API to convert session tokens to actual tokens.
    """
    try:
        # Validate session token and get actual DO token
        actual_token = secure_token_service.validate_and_get_token(session_token)
        
        if not actual_token:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        
        # Log token usage
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"🔑 Token session validated for IP: {client_ip}")
        
        return {
            "success": True,
            "token": actual_token,
            "security_level": "validated"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Session validation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to validate session")

@router.get("/tokens/audit", response_model=TokenAuditResponse, summary="Token Audit Log")
async def get_token_audit(
    current_user: User = Depends(get_current_user)
):
    """
    📊 Get comprehensive audit log for user tokens
    
    Shows token usage, security events, and recommendations.
    """
    try:
        # Get audit data from secure service
        audit_data = secure_token_service.get_token_audit_log(current_user.id)
        
        if "error" in audit_data:
            raise HTTPException(status_code=500, detail=audit_data["error"])
        
        # Add security events (could be expanded)
        security_events = [
            {
                "event": "tokens_encrypted",
                "timestamp": audit_data.get("last_updated"),
                "level": "info",
                "description": f"Total {audit_data.get('total_tokens', 0)} tokens encrypted"
            }
        ]
        
        return TokenAuditResponse(
            user_id=audit_data["user_id"],
            total_tokens=audit_data["total_tokens"],
            last_updated=audit_data["last_updated"],
            tokens=audit_data["tokens"],
            security_events=security_events
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token audit error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get token audit")

@router.post("/tokens/migrate", summary="Migrate Plaintext Tokens")
async def migrate_plaintext_tokens(
    current_user: User = Depends(get_current_user)
):
    """
    🔄 Migrate existing plaintext tokens to encrypted storage
    
    One-time migration for existing users.
    """
    try:
        # Perform migration
        success = secure_token_service.migrate_from_plaintext(current_user.id)
        
        if success:
            logger.info(f"🔄 Successfully migrated tokens for user {current_user.id}")
            return {
                "success": True,
                "message": "Tokens migrated to encrypted storage",
                "action": "plaintext_tokens_backed_up"
            }
        else:
            return {
                "success": False,
                "message": "No tokens found to migrate or migration failed"
            }
            
    except Exception as e:
        logger.error(f"❌ Token migration error: {e}")
        raise HTTPException(status_code=500, detail="Failed to migrate tokens")

@router.delete("/tokens/revoke", summary="Emergency Token Revocation")
async def revoke_all_tokens(
    confirm: bool = False,
    current_user: User = Depends(get_current_user)
):
    """
    🚨 Emergency revocation of all user tokens
    
    Nuclear option for security incidents.
    """
    try:
        if not confirm:
            raise HTTPException(
                status_code=400, 
                detail="Must confirm token revocation with confirm=true"
            )
        
        # Revoke all tokens
        success = secure_token_service.revoke_all_tokens(current_user.id)
        
        if success:
            logger.warning(f"🚨 ALL tokens revoked for user {current_user.id}")
            return {
                "success": True,
                "message": "All tokens have been revoked",
                "action": "emergency_revocation_completed",
                "next_step": "Re-add tokens to continue using the service"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to revoke tokens")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token revocation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to revoke tokens")

# ================================
# SECURITY STATUS ENDPOINTS
# ================================

@router.get("/security/status", summary="Security Status Check")
async def get_security_status(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    🛡️ Get comprehensive security status
    
    Checks token security, connection security, and recommendations.
    """
    try:
        # Check HTTPS
        is_https = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
        
        # Check headers
        security_headers = {
            "user_agent": request.headers.get("user-agent", ""),
            "x_requested_with": request.headers.get("x-requested-with", ""),
            "authorization": "present" if request.headers.get("authorization") else "missing"
        }
        
        # Get token audit
        audit_data = secure_token_service.get_token_audit_log(current_user.id)
        
        # Security recommendations
        recommendations = []
        if not is_https:
            recommendations.append("Use HTTPS for secure communication")
        if audit_data.get("total_tokens", 0) == 0:
            recommendations.append("Add encrypted tokens for enhanced security")
        
        return {
            "user_id": current_user.id,
            "https_enabled": is_https,
            "encrypted_tokens": audit_data.get("total_tokens", 0),
            "security_level": "enhanced" if audit_data.get("total_tokens", 0) > 0 else "basic",
            "headers": security_headers,
            "recommendations": recommendations,
            "last_audit": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Security status error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get security status")
