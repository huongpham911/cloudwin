"""
Admin Spaces Management API
Load and manage DigitalOcean Spaces from all user tokens
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import os
import logging
from typing import List, Dict, Any

from app.api.deps import get_db, require_admin
from app.models.auth_models import User
from app.services.digitalocean_service import DigitalOceanService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/spaces")
async def get_all_spaces(
    admin_user: User = Depends(require_admin)
):
    """Get all Spaces from all user tokens (Admin only)"""
    logger.info(f"🔍 Admin {admin_user.email} requesting all spaces")
    
    try:
        # Load tokens from tokens_secure.json (primary) or user_tokens.json (fallback)
        tokens_file = "tokens_secure.json"
        fallback_file = "user_tokens.json"

        if not os.path.exists(tokens_file) and not os.path.exists(fallback_file):
            logger.warning("Neither tokens_secure.json nor user_tokens.json found")
            return {
                "spaces": [],
                "total_tokens": 0,
                "users_with_tokens": 0,
                "message": "No token file found"
            }

        # Try to load from tokens_secure.json first, then fallback to user_tokens.json
        user_tokens_data = {}
        if os.path.exists(tokens_file):
            with open(tokens_file, 'r') as f:
                data = json.load(f)
                if 'users' in data:
                    user_tokens_data = data['users']
                else:
                    # Old format fallback
                    user_tokens_data = data
        elif os.path.exists(fallback_file):
            with open(fallback_file, 'r') as f:
                user_tokens_data = json.load(f)

        all_spaces = []
        total_tokens = 0
        users_with_tokens = 0

        # Process each user's tokens
        for user_id, user_data in user_tokens_data.items():
            user_tokens = user_data.get('tokens', [])
            if not user_tokens:
                continue
                
            users_with_tokens += 1
            
            # Process each token
            for token_data in user_tokens:
                token = token_data.get('token')
                if not token or not token_data.get('is_valid', True):
                    continue
                    
                total_tokens += 1
                
                try:
                    # Initialize DO service with this token
                    do_service = DigitalOceanService(token)
                    
                    # Get Spaces keys (access keys for Spaces)
                    spaces_keys = do_service.client.spaces_keys.list()
                    
                    # Process each Spaces key
                    if hasattr(spaces_keys, 'spaces_keys') and spaces_keys.spaces_keys:
                        for key in spaces_keys.spaces_keys:
                            space_info = {
                                "user_id": user_id,
                                "token_name": token_data.get('name', 'Default'),
                                "masked_token": f"***...{token[-10:]}",
                                "key_id": key.id,
                                "key_name": key.name,
                                "access_key_id": key.access_key_id,
                                "secret_access_key": key.secret_access_key,
                                "endpoint": f"https://{key.name}.{key.region}.digitaloceanspaces.com",
                                "region": key.region,
                                "created_at": str(key.created_at) if hasattr(key, 'created_at') else None
                            }
                            all_spaces.append(space_info)
                            
                except Exception as e:
                    logger.error(f"Error getting spaces for token {token[-10:]}: {e}")
                    continue
        
        logger.info(f"✅ Found {len(all_spaces)} spaces from {total_tokens} tokens across {users_with_tokens} users")
        
        return {
            "spaces": all_spaces,
            "total_spaces": len(all_spaces),
            "total_tokens": total_tokens,
            "users_with_tokens": users_with_tokens,
            "message": f"Loaded {len(all_spaces)} Spaces successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Error in get_all_spaces: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load spaces: {str(e)}")

@router.get("/spaces/{space_id}/buckets")
async def get_space_buckets(
    space_id: str,
    admin_user: User = Depends(require_admin)
):
    """Get buckets for a specific Space"""
    # TODO: Implement bucket listing using boto3
    return {"message": "Bucket listing coming soon", "space_id": space_id}

@router.get("/spaces/{space_id}/buckets/{bucket_name}/files")
async def get_bucket_files(
    space_id: str,
    bucket_name: str,
    admin_user: User = Depends(require_admin)
):
    """Get files in a specific bucket"""
    # TODO: Implement file listing using boto3
    return {"message": "File listing coming soon", "space_id": space_id, "bucket": bucket_name}
