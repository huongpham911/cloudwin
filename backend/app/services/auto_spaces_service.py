"""
Auto Spaces Credentials Service
Automatically fetch and manage Spaces credentials from DigitalOcean API
"""

import json
import os
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path
import pydo
from pydo import Client

logger = logging.getLogger(__name__)

class AutoSpacesService:
    """
    Service to automatically fetch and manage Spaces credentials
    """
    
    def __init__(self):
        self.tokens_file = Path("tokens_secure.json")
    
    async def auto_load_spaces_credentials(self, do_token: str) -> Dict[str, Any]:
        """
        Automatically fetch Spaces credentials from DigitalOcean API
        """
        try:
            logger.info(f"🔍 Auto-loading Spaces credentials for token: {do_token[:20]}...")
            
            # Initialize DO client
            client = Client(token=do_token)
            
            # Get Spaces keys
            spaces_keys_response = client.spaces_keys.list()
            
            if not hasattr(spaces_keys_response, 'spaces_keys') or not spaces_keys_response.spaces_keys:
                logger.warning("⚠️ No Spaces keys found for this token")
                return {
                    "success": False,
                    "error": "No Spaces keys found. Please create a Spaces key in DigitalOcean dashboard first.",
                    "spaces_keys": []
                }
            
            # Get first available Spaces key
            first_key = spaces_keys_response.spaces_keys[0]
            
            credentials = {
                "access_key": first_key.access_key_id,
                "secret_key": first_key.secret_access_key,
                "region": getattr(first_key, 'region', 'nyc3'),
                "endpoint": f"https://{getattr(first_key, 'region', 'nyc3')}.digitaloceanspaces.com",
                "key_name": first_key.name,
                "key_id": first_key.id
            }
            
            logger.info(f"✅ Auto-loaded Spaces credentials: {credentials['access_key'][:10]}...")
            
            return {
                "success": True,
                "credentials": credentials,
                "total_keys": len(spaces_keys_response.spaces_keys),
                "all_keys": [
                    {
                        "id": key.id,
                        "name": key.name,
                        "access_key_id": key.access_key_id,
                        "region": getattr(key, 'region', 'nyc3')
                    }
                    for key in spaces_keys_response.spaces_keys
                ]
            }
            
        except Exception as e:
            logger.error(f"❌ Error auto-loading Spaces credentials: {e}")
            return {
                "success": False,
                "error": f"Failed to auto-load Spaces credentials: {str(e)}",
                "credentials": None
            }
    
    def save_credentials_to_file(self, credentials: Dict[str, Any]) -> bool:
        """
        Save Spaces credentials to tokens_secure.json
        """
        try:
            # Load existing data
            data = {}
            if self.tokens_file.exists():
                with open(self.tokens_file, 'r') as f:
                    data = json.load(f)
            
            # Update spaces_credentials
            data['spaces_credentials'] = credentials
            data['updated_at'] = "2025-08-20T18:00:00Z"
            
            # Save back to file
            with open(self.tokens_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info("✅ Spaces credentials saved to tokens_secure.json")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error saving credentials: {e}")
            return False
    
    async def auto_setup_spaces_for_token(self, do_token: str) -> Dict[str, Any]:
        """
        Complete auto-setup: fetch credentials and save to file
        """
        try:
            # Auto-load credentials
            result = await self.auto_load_spaces_credentials(do_token)
            
            if not result['success']:
                return result
            
            # Save to file
            credentials = result['credentials']
            saved = self.save_credentials_to_file(credentials)
            
            if saved:
                return {
                    "success": True,
                    "message": "Spaces credentials auto-loaded and saved successfully",
                    "credentials": credentials,
                    "total_keys": result['total_keys']
                }
            else:
                return {
                    "success": False,
                    "error": "Failed to save credentials to file",
                    "credentials": credentials
                }
                
        except Exception as e:
            logger.error(f"❌ Error in auto-setup: {e}")
            return {
                "success": False,
                "error": f"Auto-setup failed: {str(e)}"
            }
    
    def get_current_credentials(self) -> Optional[Dict[str, Any]]:
        """
        Get current Spaces credentials from file
        """
        try:
            if self.tokens_file.exists():
                with open(self.tokens_file, 'r') as f:
                    data = json.load(f)
                    return data.get('spaces_credentials')
            return None
        except Exception as e:
            logger.error(f"❌ Error reading credentials: {e}")
            return None

# Global instance
auto_spaces_service = AutoSpacesService()
