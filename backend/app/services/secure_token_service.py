"""
Secure Token Service - Enhanced security for token transmission and storage
Replaces insecure plaintext token handling with encrypted, secure methods
"""

import os
import json
import base64
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import secrets
import hashlib

from app.core.config import settings

logger = logging.getLogger(__name__)

class SecureTokenService:
    """
    Enterprise-grade secure token service for:
    - Encrypted token storage
    - Secure transmission
    - Token rotation
    - Access auditing
    """
    
    def __init__(self):
        self.tokens_file = Path(__file__).parent.parent.parent / "tokens_encrypted.json"
        self.master_key = self._get_or_create_master_key()
        self.cipher_suite = Fernet(self.master_key)
        
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key"""
        key_file = Path(__file__).parent.parent.parent / "master.key"
        
        try:
            if key_file.exists():
                with open(key_file, 'rb') as f:
                    key = f.read()
                logger.info("✅ Master key loaded from file")
                return key
            else:
                # Generate new master key
                key = Fernet.generate_key()
                with open(key_file, 'wb') as f:
                    f.write(key)
                # Secure file permissions (Unix/Linux)
                try:
                    os.chmod(key_file, 0o600)  # Owner read/write only
                except:
                    pass  # Windows doesn't support this
                logger.info("🔑 New master key generated and secured")
                return key
        except Exception as e:
            logger.error(f"❌ Master key error: {e}")
            raise
    
    def encrypt_token(self, token: str, user_id: str) -> str:
        """
        Encrypt token with user-specific encryption
        """
        try:
            # Create user-specific salt
            salt = hashlib.sha256(f"{user_id}{settings.SECRET_KEY}".encode()).digest()
            
            # Derive key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            user_key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            user_cipher = Fernet(user_key)
            
            # Encrypt token
            encrypted_token = user_cipher.encrypt(token.encode())
            return base64.b64encode(encrypted_token).decode()
            
        except Exception as e:
            logger.error(f"❌ Token encryption error: {e}")
            raise
    
    def decrypt_token(self, encrypted_token: str, user_id: str) -> str:
        """
        Decrypt token with user-specific decryption
        """
        try:
            # Create user-specific salt
            salt = hashlib.sha256(f"{user_id}{settings.SECRET_KEY}".encode()).digest()
            
            # Derive key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            user_key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
            user_cipher = Fernet(user_key)
            
            # Decrypt token
            decoded_token = base64.b64decode(encrypted_token.encode())
            decrypted_token = user_cipher.decrypt(decoded_token)
            return decrypted_token.decode()
            
        except Exception as e:
            logger.error(f"❌ Token decryption error: {e}")
            raise
    
    def save_encrypted_tokens(self, user_id: str, tokens: List[str]) -> bool:
        """
        Save tokens with encryption
        """
        try:
            # Load existing data
            encrypted_data = self.load_encrypted_tokens_file()
            
            # Encrypt new tokens
            encrypted_tokens = []
            for token in tokens:
                if token and token.strip():
                    encrypted_token = self.encrypt_token(token.strip(), user_id)
                    token_fingerprint = hashlib.sha256(token.encode()).hexdigest()[:16]
                    
                    encrypted_tokens.append({
                        "encrypted_token": encrypted_token,
                        "fingerprint": token_fingerprint,
                        "created_at": datetime.utcnow().isoformat(),
                        "last_used": None,
                        "usage_count": 0
                    })
            
            # Store user tokens
            encrypted_data["users"][user_id] = {
                "tokens": encrypted_tokens,
                "updated_at": datetime.utcnow().isoformat(),
                "total_tokens": len(encrypted_tokens)
            }
            
            # Save to file
            with open(self.tokens_file, 'w') as f:
                json.dump(encrypted_data, f, indent=2)
            
            logger.info(f"🔒 Saved {len(encrypted_tokens)} encrypted tokens for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Save encrypted tokens error: {e}")
            return False
    
    def load_user_tokens(self, user_id: str) -> List[str]:
        """
        Load and decrypt tokens for user
        """
        try:
            encrypted_data = self.load_encrypted_tokens_file()
            user_data = encrypted_data.get("users", {}).get(user_id, {})
            encrypted_tokens = user_data.get("tokens", [])
            
            # Decrypt tokens
            decrypted_tokens = []
            for token_data in encrypted_tokens:
                try:
                    encrypted_token = token_data["encrypted_token"]
                    decrypted_token = self.decrypt_token(encrypted_token, user_id)
                    decrypted_tokens.append(decrypted_token)
                    
                    # Update usage tracking
                    token_data["last_used"] = datetime.utcnow().isoformat()
                    token_data["usage_count"] = token_data.get("usage_count", 0) + 1
                    
                except Exception as e:
                    logger.error(f"❌ Failed to decrypt token: {e}")
                    continue
            
            # Save updated usage data
            with open(self.tokens_file, 'w') as f:
                json.dump(encrypted_data, f, indent=2)
            
            logger.info(f"🔓 Loaded {len(decrypted_tokens)} tokens for user {user_id}")
            return decrypted_tokens
            
        except Exception as e:
            logger.error(f"❌ Load user tokens error: {e}")
            return []
    
    def load_encrypted_tokens_file(self) -> Dict[str, Any]:
        """
        Load encrypted tokens file
        """
        try:
            if self.tokens_file.exists():
                with open(self.tokens_file, 'r') as f:
                    return json.load(f)
            else:
                # Create new encrypted structure
                return {
                    "version": "1.0",
                    "created_at": datetime.utcnow().isoformat(),
                    "encryption": "AES-256-Fernet+PBKDF2",
                    "users": {}
                }
        except Exception as e:
            logger.error(f"❌ Load encrypted file error: {e}")
            return {"users": {}}
    
    def migrate_from_plaintext(self, user_id: str) -> bool:
        """
        Migrate existing plaintext tokens to encrypted storage
        """
        try:
            # Load old plaintext tokens from tokens_secure.json (if in old format)
            old_tokens_file = Path(__file__).parent.parent.parent / "tokens_secure.json"

            if not old_tokens_file.exists():
                logger.info("📝 No tokens_secure.json file found - nothing to migrate")
                return True

            with open(old_tokens_file, 'r') as f:
                data = json.load(f)
                # Check if already in new encrypted format
                if 'users' in data and 'encryption' in data:
                    logger.info("📝 tokens_secure.json already in encrypted format")
                    return True
                plaintext_tokens = data.get('tokens', [])
            
            if not plaintext_tokens:
                logger.info("📝 No plaintext tokens found - nothing to migrate")
                return True
            
            # Encrypt and save
            success = self.save_encrypted_tokens(user_id, plaintext_tokens)
            
            if success:
                # Backup old file
                backup_file = old_tokens_file.with_suffix('.json.backup')
                old_tokens_file.rename(backup_file)
                logger.info(f"🔄 Migrated {len(plaintext_tokens)} tokens to encrypted storage")
                logger.info(f"📁 Old file backed up to: {backup_file}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Migration error: {e}")
            return False
    
    def create_secure_token_session(self, user_id: str, token_index: int = 0) -> Optional[str]:
        """
        Create secure token session with temporary access
        """
        try:
            tokens = self.load_user_tokens(user_id)
            
            if not tokens or token_index >= len(tokens):
                return None
            
            # Create temporary session token
            session_data = {
                "user_id": user_id,
                "token_index": token_index,
                "created_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
                "session_id": secrets.token_urlsafe(32)
            }
            
            # Encrypt session data
            session_json = json.dumps(session_data)
            encrypted_session = self.cipher_suite.encrypt(session_json.encode())
            session_token = base64.b64encode(encrypted_session).decode()
            
            logger.info(f"🔐 Created secure session for user {user_id}")
            return session_token
            
        except Exception as e:
            logger.error(f"❌ Create session error: {e}")
            return None
    
    def validate_and_get_token(self, session_token: str) -> Optional[str]:
        """
        Validate session and return actual DO token
        """
        try:
            # Decrypt session
            encrypted_session = base64.b64decode(session_token.encode())
            session_json = self.cipher_suite.decrypt(encrypted_session).decode()
            session_data = json.loads(session_json)
            
            # Check expiration
            expires_at = datetime.fromisoformat(session_data["expires_at"])
            if datetime.utcnow() > expires_at:
                logger.warning("⚠️ Session token expired")
                return None
            
            # Get actual token
            user_id = session_data["user_id"]
            token_index = session_data["token_index"]
            tokens = self.load_user_tokens(user_id)
            
            if tokens and token_index < len(tokens):
                logger.info(f"✅ Valid session for user {user_id}")
                return tokens[token_index]
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Session validation error: {e}")
            return None
    
    def revoke_all_tokens(self, user_id: str) -> bool:
        """
        Emergency revoke all tokens for user
        """
        try:
            encrypted_data = self.load_encrypted_tokens_file()
            
            if user_id in encrypted_data.get("users", {}):
                # Mark all tokens as revoked
                user_data = encrypted_data["users"][user_id]
                for token_data in user_data.get("tokens", []):
                    token_data["revoked"] = True
                    token_data["revoked_at"] = datetime.utcnow().isoformat()
                
                user_data["revoked_all"] = True
                user_data["revoked_all_at"] = datetime.utcnow().isoformat()
                
                # Save changes
                with open(self.tokens_file, 'w') as f:
                    json.dump(encrypted_data, f, indent=2)
                
                logger.warning(f"🚨 ALL tokens revoked for user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Revoke tokens error: {e}")
            return False
    
    def get_token_audit_log(self, user_id: str) -> Dict[str, Any]:
        """
        Get audit log for user tokens
        """
        try:
            encrypted_data = self.load_encrypted_tokens_file()
            user_data = encrypted_data.get("users", {}).get(user_id, {})
            
            audit_data = {
                "user_id": user_id,
                "total_tokens": user_data.get("total_tokens", 0),
                "last_updated": user_data.get("updated_at"),
                "revoked_all": user_data.get("revoked_all", False),
                "tokens": []
            }
            
            for i, token_data in enumerate(user_data.get("tokens", [])):
                audit_data["tokens"].append({
                    "index": i,
                    "fingerprint": token_data.get("fingerprint"),
                    "created_at": token_data.get("created_at"),
                    "last_used": token_data.get("last_used"),
                    "usage_count": token_data.get("usage_count", 0),
                    "revoked": token_data.get("revoked", False),
                    "revoked_at": token_data.get("revoked_at")
                })
            
            return audit_data
            
        except Exception as e:
            logger.error(f"❌ Audit log error: {e}")
            return {"error": str(e)}

# Global instance
secure_token_service = SecureTokenService()
