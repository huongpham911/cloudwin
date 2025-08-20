"""
User Token Manager for WinCloud Builder
Manages user-specific DigitalOcean tokens with secure storage
"""
import json
import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class UserTokenManager:
    """
    Manages user-specific DigitalOcean tokens
    """
    
    def __init__(self, tokens_file: str = "user_tokens.json"):
        self.tokens_file = Path(tokens_file)
        self.user_tokens: Dict[str, Any] = {}
        self.load_user_tokens()
    
    def load_user_tokens(self) -> None:
        """Load user tokens from file"""
        try:
            if self.tokens_file.exists():
                with open(self.tokens_file, 'r') as f:
                    data = json.load(f)
                    self.user_tokens = data.get("users", {})
                    logger.info(f"✅ Loaded tokens for {len(self.user_tokens)} users")
            else:
                logger.info("📝 Creating new user tokens file")
                self.user_tokens = {}
                self.save_user_tokens()
        except Exception as e:
            logger.error(f"❌ Error loading user tokens: {e}")
            self.user_tokens = {}
    
    def save_user_tokens(self) -> None:
        """Save user tokens to file"""
        try:
            data = {
                "users": self.user_tokens,
                "last_updated": datetime.now().isoformat(),
                "version": "1.0"
            }
            with open(self.tokens_file, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"✅ Saved tokens for {len(self.user_tokens)} users")
        except Exception as e:
            logger.error(f"❌ Error saving user tokens: {e}")
    
    def add_user_token(self, user_id: str, token: str, token_name: str = None) -> bool:
        """Add a token for a user"""
        try:
            if user_id not in self.user_tokens:
                self.user_tokens[user_id] = {
                    "tokens": [],
                    "created_at": datetime.now().isoformat()
                }
            
            # Check if token already exists
            existing_tokens = [t["token"] for t in self.user_tokens[user_id]["tokens"]]
            if token in existing_tokens:
                logger.warning(f"⚠️ Token already exists for user {user_id}")
                return False
            
            token_data = {
                "token": token,
                "name": token_name or f"Token {len(self.user_tokens[user_id]['tokens']) + 1}",
                "added_at": datetime.now().isoformat(),
                "is_valid": True,
                "last_used": None
            }
            
            self.user_tokens[user_id]["tokens"].append(token_data)
            self.user_tokens[user_id]["updated_at"] = datetime.now().isoformat()
            self.save_user_tokens()
            
            logger.info(f"✅ Added token for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding token for user {user_id}: {e}")
            return False
    
    def remove_user_token(self, user_id: str, token: str) -> bool:
        """Remove a token for a user"""
        try:
            if user_id not in self.user_tokens:
                return False
            
            user_data = self.user_tokens[user_id]
            original_count = len(user_data["tokens"])
            
            # Remove token
            user_data["tokens"] = [t for t in user_data["tokens"] if t["token"] != token]
            
            if len(user_data["tokens"]) < original_count:
                user_data["updated_at"] = datetime.now().isoformat()
                self.save_user_tokens()
                logger.info(f"✅ Removed token for user {user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Error removing token for user {user_id}: {e}")
            return False
    
    def get_user_tokens(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tokens for a user"""
        try:
            if user_id not in self.user_tokens:
                return []
            
            return self.user_tokens[user_id].get("tokens", [])
            
        except Exception as e:
            logger.error(f"❌ Error getting tokens for user {user_id}: {e}")
            return []
    
    def get_all_tokens(self) -> List[str]:
        """Get all tokens from all users (for backward compatibility)"""
        try:
            all_tokens = []
            for user_id, user_data in self.user_tokens.items():
                for token_data in user_data.get("tokens", []):
                    if token_data.get("is_valid", True):
                        all_tokens.append(token_data["token"])
            return all_tokens
        except Exception as e:
            logger.error(f"❌ Error getting all tokens: {e}")
            return []
    
    def validate_token(self, user_id: str, token: str) -> bool:
        """Validate if a token exists and is valid for a user"""
        try:
            user_tokens = self.get_user_tokens(user_id)
            for token_data in user_tokens:
                if token_data["token"] == token:
                    return token_data.get("is_valid", True)
            return False
        except Exception as e:
            logger.error(f"❌ Error validating token for user {user_id}: {e}")
            return False
    
    def mark_token_used(self, user_id: str, token: str) -> None:
        """Mark a token as recently used"""
        try:
            if user_id in self.user_tokens:
                for token_data in self.user_tokens[user_id]["tokens"]:
                    if token_data["token"] == token:
                        token_data["last_used"] = datetime.now().isoformat()
                        break
                self.save_user_tokens()
        except Exception as e:
            logger.error(f"❌ Error marking token as used: {e}")

# Global instance
user_token_manager = UserTokenManager()
