"""
Enhanced Security Service for WinCloud Builder
Provides enterprise-grade security features including 2FA, encryption, and monitoring
"""

import secrets
import pyotp
import qrcode
import base64
import io
import hashlib
import hmac
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from sqlalchemy.orm import Session
from fastapi import HTTPException, Request
from redis import Redis

from app.core.config import settings
from app.models.auth_models import User, UserSession  
from app.models.security_models import TwoFactorAuth, SecurityEvent
from app.core.database import get_db

logger = logging.getLogger(__name__)

class EnhancedSecurityService:
    """
    Enterprise-grade security service with advanced features
    """
    
    def __init__(self):
        self.redis_client = Redis(host='localhost', port=6379, db=2, decode_responses=True)
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Security thresholds
        self.security_config = {
            "max_failed_attempts": 5,
            "lockout_duration": 3600,  # 1 hour
            "session_timeout": 1800,   # 30 minutes
            "max_concurrent_sessions": 3,
            "password_history_count": 5,
            "api_key_rotation_days": 90
        }
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for sensitive data"""
        key_file = "encryption.key"
        
        try:
            with open(key_file, "rb") as f:
                return f.read()
        except FileNotFoundError:
            # Generate new key
            key = Fernet.generate_key()
            with open(key_file, "wb") as f:
                f.write(key)
            logger.info("🔐 Generated new encryption key")
            return key
    
    # ================================
    # 2FA IMPLEMENTATION
    # ================================
    
    def setup_2fa(self, db: Session, user_id: str) -> Dict[str, Any]:
        """
        Setup 2FA for user
        
        Returns:
            Dictionary with QR code and backup codes
        """
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Generate secret
            secret = pyotp.random_base32()
            
            # Create TOTP URL
            totp_url = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user.email,
                issuer_name="WinCloud Builder"
            )
            
            # Generate QR code
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp_url)
            qr.make(fit=True)
            
            # Convert QR code to base64
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
            
            # Generate backup codes
            backup_codes = [self._generate_backup_code() for _ in range(10)]
            encrypted_backup_codes = [
                self.encrypt_sensitive_data(code) for code in backup_codes
            ]
            
            # Save 2FA settings
            two_fa = TwoFactorAuth(
                user_id=user_id,
                secret=self.encrypt_sensitive_data(secret),
                backup_codes=json.dumps(encrypted_backup_codes),
                is_enabled=False,  # Will be enabled after verification
                created_at=datetime.utcnow()
            )
            
            db.add(two_fa)
            db.commit()
            
            # Log security event
            self.log_security_event(
                db, user_id, "2fa_setup_initiated", 
                {"user_email": user.email}
            )
            
            return {
                "secret": secret,
                "qr_code": f"data:image/png;base64,{qr_code_base64}",
                "backup_codes": backup_codes,
                "totp_url": totp_url
            }
            
        except Exception as e:
            logger.error(f"Error setting up 2FA for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to setup 2FA")
    
    def verify_2fa_setup(self, db: Session, user_id: str, token: str) -> bool:
        """
        Verify 2FA setup with TOTP token
        """
        try:
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user_id,
                TwoFactorAuth.is_enabled == False
            ).first()
            
            if not two_fa:
                raise HTTPException(status_code=404, detail="2FA setup not found")
            
            # Decrypt secret
            secret = self.decrypt_sensitive_data(two_fa.secret)
            
            # Verify token
            totp = pyotp.TOTP(secret)
            if totp.verify(token, valid_window=2):
                # Enable 2FA
                two_fa.is_enabled = True
                two_fa.verified_at = datetime.utcnow()
                db.commit()
                
                # Log security event
                self.log_security_event(
                    db, user_id, "2fa_enabled", 
                    {"verification_method": "totp"}
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying 2FA setup for user {user_id}: {e}")
            return False
    
    def verify_2fa_token(self, db: Session, user_id: str, token: str) -> bool:
        """
        Verify 2FA token for login
        """
        try:
            two_fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user_id,
                TwoFactorAuth.is_enabled == True
            ).first()
            
            if not two_fa:
                return False
            
            # Try TOTP first
            secret = self.decrypt_sensitive_data(two_fa.secret)
            totp = pyotp.TOTP(secret)
            
            if totp.verify(token, valid_window=2):
                # Update last used
                two_fa.last_used_at = datetime.utcnow()
                db.commit()
                return True
            
            # Try backup codes
            if self._verify_backup_code(two_fa, token, db):
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying 2FA token for user {user_id}: {e}")
            return False
    
    def _generate_backup_code(self) -> str:
        """Generate a backup code"""
        return f"{secrets.randbelow(10000):04d}-{secrets.randbelow(10000):04d}"
    
    def _verify_backup_code(self, two_fa: TwoFactorAuth, code: str, db: Session) -> bool:
        """Verify and consume backup code"""
        try:
            encrypted_codes = json.loads(two_fa.backup_codes)
            
            for i, encrypted_code in enumerate(encrypted_codes):
                decrypted_code = self.decrypt_sensitive_data(encrypted_code)
                if decrypted_code == code:
                    # Remove used backup code
                    encrypted_codes.pop(i)
                    two_fa.backup_codes = json.dumps(encrypted_codes)
                    two_fa.last_used_at = datetime.utcnow()
                    db.commit()
                    
                    # Log backup code usage
                    self.log_security_event(
                        db, two_fa.user_id, "2fa_backup_code_used",
                        {"remaining_codes": len(encrypted_codes)}
                    )
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying backup code: {e}")
            return False
    
    # ================================
    # DATA ENCRYPTION
    # ================================
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        try:
            encrypted_data = self.cipher_suite.encrypt(data.encode())
            return base64.b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt_sensitive_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            decoded_data = base64.b64decode(encrypted_data.encode())
            decrypted_data = self.cipher_suite.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
    
    def encrypt_api_key(self, api_key: str, user_id: str) -> str:
        """Encrypt API key with user-specific salt"""
        try:
            # Create user-specific salt
            salt = hashlib.sha256(f"{user_id}{settings.SECRET_KEY}".encode()).digest()
            
            # Derive key from password and salt
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            cipher = Fernet(key)
            
            # Encrypt the API key
            encrypted_key = cipher.encrypt(api_key.encode())
            return base64.b64encode(encrypted_key).decode()
            
        except Exception as e:
            logger.error(f"API key encryption error: {e}")
            raise
    
    def decrypt_api_key(self, encrypted_api_key: str, user_id: str) -> str:
        """Decrypt API key with user-specific salt"""
        try:
            # Create same salt
            salt = hashlib.sha256(f"{user_id}{settings.SECRET_KEY}".encode()).digest()
            
            # Derive same key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            cipher = Fernet(key)
            
            # Decrypt the API key
            encrypted_data = base64.b64decode(encrypted_api_key.encode())
            decrypted_key = cipher.decrypt(encrypted_data)
            return decrypted_key.decode()
            
        except Exception as e:
            logger.error(f"API key decryption error: {e}")
            raise
    
    # ================================
    # SESSION SECURITY
    # ================================
    
    def create_secure_session(
        self, 
        db: Session, 
        user_id: str, 
        request: Request
    ) -> Dict[str, Any]:
        """Create secure session with device tracking"""
        try:
            # Get device info
            user_agent = request.headers.get("user-agent", "")
            ip_address = request.client.host
            device_fingerprint = self._generate_device_fingerprint(user_agent, ip_address)
            
            # Check concurrent sessions
            active_sessions = db.query(UserSession).filter(
                UserSession.user_id == user_id,
                UserSession.is_active == True,
                UserSession.expires_at > datetime.utcnow()
            ).count()
            
            if active_sessions >= self.security_config["max_concurrent_sessions"]:
                # Invalidate oldest session
                oldest_session = db.query(UserSession).filter(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                ).order_by(UserSession.created_at).first()
                
                if oldest_session:
                    oldest_session.is_active = False
                    oldest_session.terminated_at = datetime.utcnow()
                    oldest_session.termination_reason = "max_sessions_exceeded"
            
            # Create new session
            session_id = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(
                seconds=self.security_config["session_timeout"]
            )
            
            user_session = UserSession(
                id=session_id,
                user_id=user_id,
                device_fingerprint=device_fingerprint,
                ip_address=ip_address,
                user_agent=user_agent,
                created_at=datetime.utcnow(),
                expires_at=expires_at,
                last_activity=datetime.utcnow(),
                is_active=True
            )
            
            db.add(user_session)
            db.commit()
            
            # Store session in Redis for fast lookup
            session_data = {
                "user_id": user_id,
                "device_fingerprint": device_fingerprint,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.redis_client.setex(
                f"session:{session_id}",
                self.security_config["session_timeout"],
                json.dumps(session_data)
            )
            
            # Log security event
            self.log_security_event(
                db, user_id, "session_created",
                {
                    "session_id": session_id,
                    "ip_address": ip_address,
                    "device_fingerprint": device_fingerprint[:16] + "..."
                }
            )
            
            return {
                "session_id": session_id,
                "expires_at": expires_at.isoformat(),
                "device_fingerprint": device_fingerprint
            }
            
        except Exception as e:
            logger.error(f"Error creating secure session: {e}")
            raise HTTPException(status_code=500, detail="Failed to create session")
    
    def validate_session(
        self, 
        db: Session, 
        session_id: str, 
        request: Request
    ) -> Optional[Dict[str, Any]]:
        """Validate session with security checks"""
        try:
            # Check Redis first (fast lookup)
            session_data = self.redis_client.get(f"session:{session_id}")
            if not session_data:
                return None
            
            session_info = json.loads(session_data)
            
            # Get full session from database
            user_session = db.query(UserSession).filter(
                UserSession.id == session_id,
                UserSession.is_active == True
            ).first()
            
            if not user_session:
                return None
            
            # Check expiration
            if user_session.expires_at <= datetime.utcnow():
                self._invalidate_session(db, session_id, "expired")
                return None
            
            # Check device fingerprint (basic device tracking)
            current_fingerprint = self._generate_device_fingerprint(
                request.headers.get("user-agent", ""),
                request.client.host
            )
            
            if user_session.device_fingerprint != current_fingerprint:
                self.log_security_event(
                    db, user_session.user_id, "session_fingerprint_mismatch",
                    {
                        "session_id": session_id,
                        "expected": user_session.device_fingerprint[:16] + "...",
                        "actual": current_fingerprint[:16] + "..."
                    }
                )
                # Don't invalidate, just log - could be legitimate network change
            
            # Update last activity
            user_session.last_activity = datetime.utcnow()
            db.commit()
            
            # Extend Redis TTL
            self.redis_client.expire(
                f"session:{session_id}",
                self.security_config["session_timeout"]
            )
            
            return {
                "user_id": user_session.user_id,
                "session_id": session_id,
                "device_fingerprint": user_session.device_fingerprint,
                "last_activity": user_session.last_activity.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error validating session: {e}")
            return None
    
    def _generate_device_fingerprint(self, user_agent: str, ip_address: str) -> str:
        """Generate device fingerprint for session tracking"""
        fingerprint_data = f"{user_agent}{ip_address}"
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()
    
    def _invalidate_session(self, db: Session, session_id: str, reason: str):
        """Invalidate session"""
        try:
            user_session = db.query(UserSession).filter(
                UserSession.id == session_id
            ).first()
            
            if user_session:
                user_session.is_active = False
                user_session.terminated_at = datetime.utcnow()
                user_session.termination_reason = reason
                db.commit()
            
            # Remove from Redis
            self.redis_client.delete(f"session:{session_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating session: {e}")
    
    # ================================
    # SECURITY MONITORING
    # ================================
    
    def log_security_event(
        self, 
        db: Session, 
        user_id: str, 
        event_type: str, 
        details: Dict[str, Any],
        risk_level: str = "low"
    ):
        """Log detailed security event"""
        try:
            security_event = SecurityEvent(
                user_id=user_id,
                event_type=event_type,
                details=json.dumps(details),
                risk_level=risk_level,
                created_at=datetime.utcnow()
            )
            
            db.add(security_event)
            db.commit()
            
            # Also store in Redis for real-time monitoring
            event_key = f"security_event:{int(datetime.utcnow().timestamp())}"
            event_data = {
                "user_id": user_id,
                "event_type": event_type,
                "details": details,
                "risk_level": risk_level,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            self.redis_client.setex(event_key, 86400, json.dumps(event_data))
            
            # Alert on high-risk events
            if risk_level in ["high", "critical"]:
                self._trigger_security_alert(event_data)
                
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def _trigger_security_alert(self, event_data: Dict[str, Any]):
        """Trigger security alert for high-risk events"""
        try:
            # Store alert in Redis
            alert_key = f"security_alert:{int(datetime.utcnow().timestamp())}"
            self.redis_client.setex(alert_key, 3600, json.dumps(event_data))
            
            # Log critical security event
            logger.critical(f"🚨 SECURITY ALERT: {event_data}")
            
            # In production, send to security team email/Slack
            
        except Exception as e:
            logger.error(f"Error triggering security alert: {e}")
    
    def get_security_dashboard(self, db: Session) -> Dict[str, Any]:
        """Get security dashboard data"""
        try:
            now = datetime.utcnow()
            last_24h = now - timedelta(hours=24)
            last_7d = now - timedelta(days=7)
            
            # Get recent security events
            recent_events = db.query(SecurityEvent).filter(
                SecurityEvent.created_at >= last_24h
            ).count()
            
            high_risk_events = db.query(SecurityEvent).filter(
                SecurityEvent.created_at >= last_7d,
                SecurityEvent.risk_level.in_(["high", "critical"])
            ).count()
            
            # Get active sessions
            active_sessions = db.query(UserSession).filter(
                UserSession.is_active == True,
                UserSession.expires_at > now
            ).count()
            
            # Get blocked IPs
            blocked_ips = len(self.redis_client.keys("blocked_ip:*"))
            
            # Get security alerts
            security_alerts = len(self.redis_client.keys("security_alert:*"))
            
            return {
                "recent_events_24h": recent_events,
                "high_risk_events_7d": high_risk_events,
                "active_sessions": active_sessions,
                "blocked_ips": blocked_ips,
                "security_alerts": security_alerts,
                "timestamp": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting security dashboard: {e}")
            return {"error": str(e)}

# Global enhanced security service
enhanced_security = EnhancedSecurityService()
