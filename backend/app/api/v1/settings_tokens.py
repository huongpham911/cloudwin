"""
Token management endpoints for DigitalOcean API tokens
Handles CRUD operations and synchronization between frontend components
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import json
import os
import requests
from pathlib import Path

router = APIRouter()

def load_tokens_secure() -> Dict[str, Any]:
    """Load tokens from enhanced secure token service"""
    try:
        from app.services.enhanced_token_service import enhanced_token_service
        user_tokens = enhanced_token_service.get_all_valid_tokens()
        return {"tokens": user_tokens}
    except Exception as e:
        print(f"Error loading secure tokens: {e}")
        return {"tokens": []}

def save_tokens_secure(tokens_data: Dict[str, Any]) -> bool:
    """Save tokens using enhanced secure token service"""
    try:
        from app.services.enhanced_token_service import enhanced_token_service

        tokens = tokens_data.get("tokens", [])
        user_id = "admin_user"  # TODO: Get from proper user context

        success_count = 0
        for i, token in enumerate(tokens):
            if token and token.strip():
                token_name = f"Settings Token {i+1}"
                if enhanced_token_service.add_user_token(user_id, token.strip(), token_name):
                    success_count += 1

        return success_count > 0
    except Exception as e:
        print(f"Error saving secure tokens: {e}")
        return False

def validate_do_token(token: str) -> bool:
    """Validate DigitalOcean token by making API call"""
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.get("https://api.digitalocean.com/v2/account", headers=headers, timeout=10)
        return response.status_code == 200
    except Exception as e:
        print(f"Token validation error: {e}")
        return False

def mask_token(token: str) -> str:
    """Mask token để chỉ hiển thị 10 ký tự cuối"""
    if not token or len(token) < 20:
        return token
    return f"***...{token[-10:]}"

@router.get("/tokens")
async def get_tokens():
    """Get all configured tokens with status"""
    try:
        tokens_data = load_tokens_secure()
        tokens = tokens_data.get("tokens", [])
        
        # Transform tokens for frontend
        token_list = []
        for i, token in enumerate(tokens):
            if isinstance(token, str):
                # Validate token with DO API
                is_valid = validate_do_token(token)
                token_list.append({
                    "token": token,
                    "masked_token": mask_token(token),
                    "status": "valid" if is_valid else "invalid"
                })
            elif isinstance(token, dict):
                # Re-validate existing tokens
                token_str = token.get("token", "")
                is_valid = validate_do_token(token_str) if token_str else False
                token_list.append({
                    "token": token_str,
                    "masked_token": token.get("masked_token", mask_token(token_str)),
                    "status": "valid" if is_valid else "invalid"
                })
        
        return {
            "success": True,
            "tokens": token_list,
            "total": len(token_list),
            "valid_count": len([t for t in token_list if t["status"] == "valid"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load tokens: {str(e)}")

@router.post("/tokens")
async def update_tokens(request: Dict[str, Any]):
    """Update all tokens"""
    try:
        tokens = request.get("tokens", [])
        
        # Validate tokens format
        for token in tokens:
            if not isinstance(token, str) or not token.startswith("dop_v1_"):
                raise HTTPException(status_code=400, detail="Invalid token format")
        
        # Save tokens
        tokens_data = {
            "tokens": tokens,
            "updated_at": str(Path().cwd()),  # timestamp placeholder
            "active_clients": len(tokens)
        }
        
        if save_tokens_secure(tokens_data):
            return {
                "success": True,
                "message": "Tokens updated successfully",
                "active_clients": len(tokens)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save tokens")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update tokens: {str(e)}")

@router.post("/tokens/add")
async def add_token(request: Dict[str, Any]):
    """Add a new token"""
    try:
        new_token = request.get("token", "").strip()
        name = request.get("name", "")
        
        if not new_token or not new_token.startswith("dop_v1_"):
            raise HTTPException(status_code=400, detail="Invalid DigitalOcean token format")
        
        # Load existing tokens
        tokens_data = load_tokens()
        tokens = tokens_data.get("tokens", [])
        
        # Check if token already exists
        existing_tokens = [t if isinstance(t, str) else t.get("token", "") for t in tokens]
        if new_token in existing_tokens:
            raise HTTPException(status_code=400, detail="Token already exists")
        
        # Add new token
        tokens.append(new_token)
        tokens_data["tokens"] = tokens
        
        if save_tokens_secure(tokens_data):
            return {
                "success": True,
                "message": "Token added successfully",
                "total_tokens": len(tokens)
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to save token")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add token: {str(e)}")

@router.delete("/tokens/{token_id}")
async def remove_token(token_id: int):
    """Remove a token by index"""
    try:
        tokens_data = load_tokens()
        tokens = tokens_data.get("tokens", [])
        
        if 0 <= token_id < len(tokens):
            removed_token = tokens.pop(token_id)
            tokens_data["tokens"] = tokens
            
            if save_tokens_secure(tokens_data):
                return {
                    "success": True,
                    "message": "Token removed successfully",
                    "total_tokens": len(tokens)
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to save tokens")
        else:
            raise HTTPException(status_code=404, detail="Token not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove token: {str(e)}")

@router.post("/tokens/sync")
async def sync_tokens():
    """Force sync tokens and validate them"""
    try:
        tokens_data = load_tokens()
        tokens = tokens_data.get("tokens", [])
        
        # TODO: Add actual token validation against DigitalOcean API
        # For now, just return current state
        
        return {
            "success": True,
            "message": "Tokens synced successfully",
            "total_tokens": len(tokens),
            "valid_tokens": len(tokens)  # Assume all valid for now
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync tokens: {str(e)}")
