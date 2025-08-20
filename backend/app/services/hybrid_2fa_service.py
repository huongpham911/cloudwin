"""
Hybrid 2FA Service - Integrates existing file-based 2FA with enhanced database-based 2FA
Provides seamless migration and backward compatibility
"""

import logging
import pyotp
import qrcode
import secrets
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple, Any
from sqlalchemy.orm import Session

from app.models.security_models import TwoFactorAuth
from app.services.security_service import enhanced_security

logger = logging.getLogger(__name__)

class Hybrid2FAService:
    """
    Unified 2FA service that handles both file-based and database-based 2FA
    
    Features:
    - Seamless migration from file-based to database-based
    - Backward compatibility with existing users
    - Enhanced security features for new setups
    - Unified API for both storage methods
    """
    
    def __init__(self, app_instance=None):
        """Initialize with app instance for file-based access"""
        self.app = app_instance
        self.enhanced_security = enhanced_security
        
    # ================================
    # MIGRATION HELPERS
    # ================================
    
    def migrate_user_to_database(self, db: Session, user_email: str, user_id: str) -> bool:
        """
        Migrate a user's 2FA from file-based to database-based storage
        """
        try:
            if not self.app or not hasattr(self.app, 'registered_users'):
                return False
            
            # Check if user exists in file system
            user_data = self.app.registered_users.get(user_email)
            if not user_data or not user_data.get("two_factor_enabled"):
                return False
            
            # Check if already migrated
            existing_2fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user_id
            ).first()
            
            if existing_2fa:
                logger.info(f"User {user_id} already migrated to database 2FA")
                return True
            
            # Migrate 2FA data
            secret = user_data.get("two_factor_secret")
            backup_codes = user_data.get("backup_codes", [])
            used_codes = user_data.get("backup_codes_used", [])
            
            if secret:
                # Create database entry
                db_2fa = self.enhanced_security.setup_2fa(db, user_id)
                
                # Update with migrated data
                two_fa = db.query(TwoFactorAuth).filter(
                    TwoFactorAuth.user_id == user_id
                ).first()
                
                if two_fa:
                    # Encrypt and store existing secret
                    two_fa.secret = self.enhanced_security.encrypt_sensitive_data(secret)
                    two_fa.is_enabled = True
                    two_fa.is_verified = True
                    two_fa.verified_at = datetime.utcnow()
                    
                    # Migrate backup codes
                    remaining_codes = [code for code in backup_codes if code not in used_codes]
                    encrypted_codes = [
                        self.enhanced_security.encrypt_sensitive_data(code) 
                        for code in remaining_codes
                    ]
                    two_fa.backup_codes = self.enhanced_security.encrypt_sensitive_data(
                        str(encrypted_codes)
                    )
                    two_fa.recovery_codes_used = len(used_codes)
                    
                    db.commit()
                    
                    # Mark as migrated in file system
                    user_data["migrated_to_db"] = True
                    user_data["migration_date"] = datetime.now().isoformat()
                    
                    logger.info(f"✅ Successfully migrated user {user_id} 2FA to database")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Migration failed for user {user_id}: {e}")
            db.rollback()
            return False
    
    def is_user_migrated(self, user_email: str) -> bool:
        """Check if user has been migrated to database"""
        if not self.app or not hasattr(self.app, 'registered_users'):
            return False
        
        user_data = self.app.registered_users.get(user_email)
        return user_data and user_data.get("migrated_to_db", False)
    
    # ================================
    # UNIFIED 2FA OPERATIONS
    # ================================
    
    def setup_2fa(self, db: Session, user_id: str, user_email: str) -> Dict[str, Any]:
        """
        Setup 2FA - uses enhanced database system for new users
        """
        try:
            # Always use enhanced system for new setups
            setup_data = self.enhanced_security.setup_2fa(db, user_id)
            
            # Also update file system for backward compatibility
            if self.app and hasattr(self.app, 'registered_users'):
                if user_email in self.app.registered_users:
                    self.app.registered_users[user_email]["two_factor_secret_temp"] = setup_data.get("secret", "")
                    self.app.registered_users[user_email]["backup_codes_temp"] = setup_data.get("backup_codes", [])
            
            logger.info(f"✅ 2FA setup initiated for user {user_id} using enhanced system")
            return setup_data
            
        except Exception as e:
            logger.error(f"❌ 2FA setup failed for user {user_id}: {e}")
            raise
    
    def verify_setup(self, db: Session, user_id: str, user_email: str, token: str) -> bool:
        """
        Verify 2FA setup - supports both systems
        """
        try:
            # Try database first
            if self.enhanced_security.verify_2fa_setup(db, user_id, token):
                # Mark as migrated if successful
                if self.app and hasattr(self.app, 'registered_users'):
                    if user_email in self.app.registered_users:
                        self.app.registered_users[user_email]["migrated_to_db"] = True
                        self.app.registered_users[user_email]["two_factor_enabled"] = True
                
                logger.info(f"✅ 2FA setup verified for user {user_id} using enhanced system")
                return True
            
            # Fallback to file-based verification
            if self.app and hasattr(self.app, 'registered_users'):
                user_data = self.app.registered_users.get(user_email)
                if user_data:
                    temp_secret = user_data.get("two_factor_secret_temp")
                    if temp_secret and self._verify_totp_code(temp_secret, token):
                        # Enable file-based 2FA
                        user_data["two_factor_enabled"] = True
                        user_data["two_factor_secret"] = temp_secret
                        user_data["backup_codes"] = user_data.get("backup_codes_temp", [])
                        user_data["backup_codes_used"] = []
                        
                        # Clean up temp data
                        user_data.pop("two_factor_secret_temp", None)
                        user_data.pop("backup_codes_temp", None)
                        
                        logger.info(f"✅ 2FA setup verified for user {user_id} using file system")
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ 2FA setup verification failed for user {user_id}: {e}")
            return False
    
    def verify_2fa_token(self, db: Session, user_id: str, user_email: str, token: str) -> bool:
        """
        Verify 2FA token - supports both systems with auto-migration
        """
        try:
            # Try database first
            if self.enhanced_security.verify_2fa_token(db, user_id, token):
                logger.info(f"✅ 2FA verified for user {user_id} using enhanced system")
                return True
            
            # Fallback to file-based system
            if self.app and hasattr(self.app, 'registered_users'):
                user_data = self.app.registered_users.get(user_email)
                if user_data and user_data.get("two_factor_enabled"):
                    secret = user_data.get("two_factor_secret")
                    backup_codes = user_data.get("backup_codes", [])
                    used_codes = user_data.get("backup_codes_used", [])
                    
                    # Try TOTP
                    if secret and self._verify_totp_code(secret, token):
                        logger.info(f"✅ 2FA verified for user {user_id} using file system (TOTP)")
                        
                        # Auto-migrate successful users
                        self._schedule_auto_migration(db, user_email, user_id)
                        return True
                    
                    # Try backup codes
                    if token in backup_codes and token not in used_codes:
                        user_data["backup_codes_used"].append(token)
                        logger.info(f"✅ 2FA verified for user {user_id} using file system (backup code)")
                        
                        # Auto-migrate successful users
                        self._schedule_auto_migration(db, user_email, user_id)
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ 2FA verification failed for user {user_id}: {e}")
            return False
    
    def disable_2fa(self, db: Session, user_id: str, user_email: str, token: str) -> bool:
        """
        Disable 2FA - handles both systems
        """
        try:
            # Verify token first
            if not self.verify_2fa_token(db, user_id, user_email, token):
                return False
            
            success = False
            
            # Disable in database
            try:
                self.enhanced_security.disable_2fa(db, user_id, token)
                success = True
            except:
                pass
            
            # Disable in file system
            if self.app and hasattr(self.app, 'registered_users'):
                user_data = self.app.registered_users.get(user_email)
                if user_data:
                    user_data["two_factor_enabled"] = False
                    user_data.pop("two_factor_secret", None)
                    user_data.pop("backup_codes", None)
                    user_data.pop("backup_codes_used", None)
                    user_data.pop("migrated_to_db", None)
                    success = True
            
            if success:
                logger.info(f"✅ 2FA disabled for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"❌ 2FA disable failed for user {user_id}: {e}")
            return False
    
    def get_2fa_status(self, db: Session, user_id: str, user_email: str) -> Dict[str, Any]:
        """
        Get 2FA status - checks both systems
        """
        try:
            # Check database first
            db_2fa = db.query(TwoFactorAuth).filter(
                TwoFactorAuth.user_id == user_id,
                TwoFactorAuth.is_enabled == True
            ).first()
            
            if db_2fa:
                # Enhanced system data
                return {
                    "enabled": True,
                    "system": "database",
                    "verified": db_2fa.is_verified,
                    "created_at": db_2fa.created_at.isoformat() if db_2fa.created_at else None,
                    "last_used_at": db_2fa.last_used_at.isoformat() if db_2fa.last_used_at else None,
                    "backup_codes_remaining": db_2fa.recovery_codes_generated - db_2fa.recovery_codes_used,
                    "migrated": True
                }
            
            # Check file system
            if self.app and hasattr(self.app, 'registered_users'):
                user_data = self.app.registered_users.get(user_email)
                if user_data and user_data.get("two_factor_enabled"):
                    backup_codes = user_data.get("backup_codes", [])
                    used_codes = user_data.get("backup_codes_used", [])
                    
                    return {
                        "enabled": True,
                        "system": "file",
                        "verified": True,
                        "backup_codes_remaining": len(backup_codes) - len(used_codes),
                        "migrated": user_data.get("migrated_to_db", False),
                        "migration_recommended": True
                    }
            
            return {
                "enabled": False,
                "system": None,
                "migrated": False
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get 2FA status for user {user_id}: {e}")
            return {"enabled": False, "system": None, "error": str(e)}
    
    # ================================
    # HELPER METHODS
    # ================================
    
    def _verify_totp_code(self, secret: str, code: str) -> bool:
        """Verify TOTP code"""
        try:
            if not secret or not code:
                return False
            totp = pyotp.TOTP(secret)
            return totp.verify(code, valid_window=2)
        except:
            return False
    
    def _schedule_auto_migration(self, db: Session, user_email: str, user_id: str):
        """Schedule auto-migration for successful file-based users"""
        try:
            # Only migrate if not already migrated
            if not self.is_user_migrated(user_email):
                logger.info(f"🔄 Scheduling auto-migration for user {user_id}")
                # Perform migration in background (you could use celery here)
                self.migrate_user_to_database(db, user_email, user_id)
        except Exception as e:
            logger.error(f"❌ Auto-migration scheduling failed for user {user_id}: {e}")

# Global instance
hybrid_2fa_service = Hybrid2FAService()

def initialize_hybrid_2fa(app_instance):
    """Initialize the hybrid service with app instance"""
    global hybrid_2fa_service
    hybrid_2fa_service.app = app_instance
    return hybrid_2fa_service
