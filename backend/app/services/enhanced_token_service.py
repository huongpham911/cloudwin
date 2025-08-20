"""
Enhanced Token Service - Secure DigitalOcean Token Management
Replaces plain text token storage with multi-layer encryption
"""
import json
import os
import hashlib
import base64
import secrets
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

logger = logging.getLogger(__name__)

class EnhancedTokenService:
    """
    Enhanced secure token management with multi-layer encryption
    """
    
    def __init__(self, storage_file: str = "tokens_secure.json"):
        self.storage_file = Path(storage_file)
        self.master_key = self._get_or_create_master_key()
        self.token_data: Dict[str, Any] = {}
        self.load_secure_tokens()
    
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key"""
        key_file = Path("master_token.key")
        
        if key_file.exists():
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            # Generate new master key
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            logger.info("🔑 Generated new master encryption key")
            return key
    
    def _derive_user_key(self, user_id: str, user_salt: bytes = None) -> Tuple[Fernet, bytes]:
        """Derive user-specific encryption key"""
        if user_salt is None:
            user_salt = secrets.token_bytes(32)
        
        # Combine master key with user-specific data
        user_data = f"{user_id}:{self.master_key.decode('utf-8', errors='ignore')}"
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=user_salt,
            iterations=100000,
        )
        
        user_key = base64.urlsafe_b64encode(kdf.derive(user_data.encode()))
        cipher = Fernet(user_key)
        
        return cipher, user_salt
    
    def encrypt_token(self, token: str, user_id: str) -> Dict[str, str]:
        """Encrypt a DigitalOcean token with user-specific encryption"""
        try:
            # Generate user-specific cipher and salt
            cipher, salt = self._derive_user_key(user_id)
            
            # Encrypt the token
            encrypted_token = cipher.encrypt(token.encode())
            
            # Create token fingerprint for duplicate detection
            fingerprint = hashlib.sha256(token.encode()).hexdigest()[:16]
            
            return {
                "encrypted_token": base64.b64encode(encrypted_token).decode(),
                "salt": base64.b64encode(salt).decode(),
                "fingerprint": fingerprint,
                "created_at": datetime.utcnow().isoformat(),
                "last_used": None,
                "usage_count": 0,
                "is_valid": True
            }
            
        except Exception as e:
            logger.error(f"❌ Token encryption failed for user {user_id}: {e}")
            raise
    
    def decrypt_token(self, encrypted_data: Dict[str, str], user_id: str) -> Optional[str]:
        """Decrypt a token for a specific user"""
        try:
            # Get salt and encrypted token
            salt = base64.b64decode(encrypted_data["salt"].encode())
            encrypted_token = base64.b64decode(encrypted_data["encrypted_token"].encode())
            
            # Derive user key with stored salt
            cipher, _ = self._derive_user_key(user_id, salt)
            
            # Decrypt token
            decrypted_token = cipher.decrypt(encrypted_token).decode()
            
            # Update usage tracking
            encrypted_data["last_used"] = datetime.utcnow().isoformat()
            encrypted_data["usage_count"] = encrypted_data.get("usage_count", 0) + 1
            
            return decrypted_token
            
        except Exception as e:
            logger.error(f"❌ Token decryption failed for user {user_id}: {e}")
            return None
    
    def add_user_token(self, user_id: str, token: str, token_name: str = None) -> bool:
        """Add an encrypted token for a user"""
        try:
            # Validate token format
            if not token.startswith('dop_v1_') or len(token) != 71:
                logger.error(f"❌ Invalid DigitalOcean token format")
                return False
            
            # Initialize user data if not exists
            if user_id not in self.token_data:
                self.token_data[user_id] = {
                    "tokens": [],
                    "created_at": datetime.utcnow().isoformat(),
                    "total_tokens": 0
                }
            
            user_tokens = self.token_data[user_id]["tokens"]
            
            # Check for duplicates using fingerprint
            token_fingerprint = hashlib.sha256(token.encode()).hexdigest()[:16]
            for existing_token in user_tokens:
                if existing_token.get("fingerprint") == token_fingerprint:
                    logger.warning(f"⚠️ Token already exists for user {user_id}")
                    return False
            
            # Encrypt and store token
            encrypted_data = self.encrypt_token(token, user_id)
            encrypted_data["name"] = token_name or f"Token {len(user_tokens) + 1}"
            
            user_tokens.append(encrypted_data)
            
            # Update metadata
            self.token_data[user_id]["total_tokens"] = len(user_tokens)
            self.token_data[user_id]["updated_at"] = datetime.utcnow().isoformat()
            
            # Save to file
            self.save_secure_tokens()
            
            logger.info(f"✅ Encrypted token added for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to add token for user {user_id}: {e}")
            return False
    
    def get_user_tokens(self, user_id: str, decrypt: bool = False) -> List[Dict[str, Any]]:
        """Get tokens for a user (optionally decrypted)"""
        try:
            if user_id not in self.token_data:
                return []
            
            user_tokens = self.token_data[user_id]["tokens"]
            
            if not decrypt:
                # Return metadata only (no actual tokens)
                return [{
                    "name": token.get("name", "Unknown"),
                    "fingerprint": token.get("fingerprint", ""),
                    "created_at": token.get("created_at"),
                    "last_used": token.get("last_used"),
                    "usage_count": token.get("usage_count", 0),
                    "is_valid": token.get("is_valid", True)
                } for token in user_tokens]
            else:
                # Return with decrypted tokens (for API usage)
                decrypted_tokens = []
                for token_data in user_tokens:
                    decrypted_token = self.decrypt_token(token_data, user_id)
                    if decrypted_token:
                        token_info = token_data.copy()
                        token_info["token"] = decrypted_token
                        decrypted_tokens.append(token_info)
                
                return decrypted_tokens
                
        except Exception as e:
            logger.error(f"❌ Failed to get tokens for user {user_id}: {e}")
            return []
    
    def remove_user_token(self, user_id: str, fingerprint: str) -> bool:
        """Remove a token by fingerprint"""
        try:
            if user_id not in self.token_data:
                return False
            
            user_tokens = self.token_data[user_id]["tokens"]
            original_count = len(user_tokens)
            
            # Remove token by fingerprint
            self.token_data[user_id]["tokens"] = [
                token for token in user_tokens 
                if token.get("fingerprint") != fingerprint
            ]
            
            if len(self.token_data[user_id]["tokens"]) < original_count:
                self.token_data[user_id]["total_tokens"] = len(self.token_data[user_id]["tokens"])
                self.token_data[user_id]["updated_at"] = datetime.utcnow().isoformat()
                self.save_secure_tokens()
                logger.info(f"✅ Removed token for user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to remove token for user {user_id}: {e}")
            return False
    
    def load_secure_tokens(self) -> None:
        """Load encrypted tokens from file"""
        try:
            if self.storage_file.exists():
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.token_data = data.get("users", {})
                    logger.info(f"✅ Loaded encrypted tokens for {len(self.token_data)} users")
            else:
                logger.info("📝 Creating new secure token storage")
                self.token_data = {}
                self.save_secure_tokens()
        except Exception as e:
            logger.error(f"❌ Error loading secure tokens: {e}")
            self.token_data = {}
    
    def save_secure_tokens(self) -> None:
        """Save encrypted tokens to file"""
        try:
            data = {
                "users": self.token_data,
                "last_updated": datetime.utcnow().isoformat(),
                "version": "2.0",
                "encryption": "AES-256-Fernet-PBKDF2"
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"✅ Saved encrypted tokens for {len(self.token_data)} users")
        except Exception as e:
            logger.error(f"❌ Error saving secure tokens: {e}")

    def validate_token_with_do_api(self, token: str) -> bool:
        """Validate token by making actual DigitalOcean API call"""
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            response = requests.get(
                "https://api.digitalocean.com/v2/account",
                headers=headers,
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"❌ Token validation error: {e}")
            return False

    def get_all_valid_tokens(self) -> List[str]:
        """Get all valid decrypted tokens for API usage (backward compatibility)"""
        try:
            all_tokens = []
            for user_id in self.token_data:
                user_tokens = self.get_user_tokens(user_id, decrypt=True)
                for token_data in user_tokens:
                    if token_data.get("is_valid", True):
                        all_tokens.append(token_data["token"])
            return all_tokens
        except Exception as e:
            logger.error(f"❌ Error getting all valid tokens: {e}")
            return []

    def mark_token_invalid(self, user_id: str, fingerprint: str) -> bool:
        """Mark a token as invalid without removing it"""
        try:
            if user_id not in self.token_data:
                return False

            for token_data in self.token_data[user_id]["tokens"]:
                if token_data.get("fingerprint") == fingerprint:
                    token_data["is_valid"] = False
                    token_data["invalidated_at"] = datetime.utcnow().isoformat()
                    self.save_secure_tokens()
                    logger.info(f"✅ Marked token as invalid for user {user_id}")
                    return True

            return False

        except Exception as e:
            logger.error(f"❌ Failed to mark token invalid for user {user_id}: {e}")
            return False

    def cleanup_expired_tokens(self, days: int = 30) -> int:
        """Remove tokens that haven't been used for specified days"""
        try:
            removed_count = 0
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            for user_id in list(self.token_data.keys()):
                user_tokens = self.token_data[user_id]["tokens"]
                original_count = len(user_tokens)

                # Keep only tokens used within cutoff period
                self.token_data[user_id]["tokens"] = [
                    token for token in user_tokens
                    if token.get("last_used") and
                    datetime.fromisoformat(token["last_used"]) > cutoff_date
                ]

                removed = original_count - len(self.token_data[user_id]["tokens"])
                removed_count += removed

                if removed > 0:
                    self.token_data[user_id]["total_tokens"] = len(self.token_data[user_id]["tokens"])
                    self.token_data[user_id]["updated_at"] = datetime.utcnow().isoformat()

            if removed_count > 0:
                self.save_secure_tokens()
                logger.info(f"🧹 Cleaned up {removed_count} expired tokens")

            return removed_count

        except Exception as e:
            logger.error(f"❌ Error cleaning up expired tokens: {e}")
            return 0

    def get_security_stats(self) -> Dict[str, Any]:
        """Get security statistics for monitoring"""
        try:
            total_users = len(self.token_data)
            total_tokens = sum(len(user_data["tokens"]) for user_data in self.token_data.values())
            valid_tokens = 0
            recent_usage = 0

            cutoff_date = datetime.utcnow() - timedelta(days=7)

            for user_data in self.token_data.values():
                for token in user_data["tokens"]:
                    if token.get("is_valid", True):
                        valid_tokens += 1

                    if (token.get("last_used") and
                        datetime.fromisoformat(token["last_used"]) > cutoff_date):
                        recent_usage += 1

            return {
                "total_users": total_users,
                "total_tokens": total_tokens,
                "valid_tokens": valid_tokens,
                "invalid_tokens": total_tokens - valid_tokens,
                "recent_usage_7days": recent_usage,
                "encryption_enabled": True,
                "storage_file": str(self.storage_file),
                "last_updated": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Error getting security stats: {e}")
            return {"error": str(e)}

# Global instance
enhanced_token_service = EnhancedTokenService()
