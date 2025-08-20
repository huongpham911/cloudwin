from fastapi import APIRouter, HTTPException
from typing import List
import logging
from app.services.digitalocean_service import DigitalOceanService
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)

class CreateSSHKeyRequest(BaseModel):
    name: str
    public_key: str

class UpdateSSHKeyRequest(BaseModel):
    name: str

@router.get("/ssh-keys")
async def get_ssh_keys():
    """Get all SSH keys from DigitalOcean account"""
    try:
        do_service = DigitalOceanService()
        
        # Get SSH keys from first available client
        clients = do_service.get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean tokens available")
        
        client = clients[0]  # Use first client
        
        # Get SSH keys
        keys = client.ssh_keys.list()
        
        # Format response
        ssh_keys = []
        for key in keys:
            ssh_keys.append({
                "id": key.id,
                "name": key.name,
                "fingerprint": key.fingerprint,
                "public_key": key.public_key,
                "created_at": key.created_at
            })
        
        logger.info(f"Retrieved {len(ssh_keys)} SSH keys")
        return {"ssh_keys": ssh_keys}
        
    except Exception as e:
        logger.error(f"Error getting SSH keys: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get SSH keys: {str(e)}")

@router.post("/ssh-keys")
async def create_ssh_key(request: CreateSSHKeyRequest):
    """Create a new SSH key"""
    try:
        do_service = DigitalOceanService()
        
        # Get SSH keys from first available client
        clients = do_service.get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean tokens available")
        
        client = clients[0]  # Use first client
        
        # Create SSH key
        key = client.ssh_keys.create(
            name=request.name,
            public_key=request.public_key
        )
        
        # Format response
        ssh_key = {
            "id": key.id,
            "name": key.name,
            "fingerprint": key.fingerprint,
            "public_key": key.public_key,
            "created_at": key.created_at
        }
        
        logger.info(f"Created SSH key: {key.name} (ID: {key.id})")
        return {"ssh_key": ssh_key}
        
    except Exception as e:
        logger.error(f"Error creating SSH key: {str(e)}")
        
        # Check for specific DigitalOcean errors
        error_message = str(e)
        if "already exists" in error_message.lower():
            raise HTTPException(status_code=400, detail="SSH key with this name or fingerprint already exists")
        elif "invalid" in error_message.lower():
            raise HTTPException(status_code=400, detail="Invalid SSH key format")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to create SSH key: {error_message}")

@router.put("/ssh-keys/{key_id}")
async def update_ssh_key(key_id: int, request: UpdateSSHKeyRequest):
    """Update SSH key name"""
    try:
        do_service = DigitalOceanService()
        
        # Get SSH keys from first available client
        clients = do_service.get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean tokens available")
        
        client = clients[0]  # Use first client
        
        # Update SSH key
        key = client.ssh_keys.update(
            ssh_key_id=key_id,
            name=request.name
        )
        
        # Format response
        ssh_key = {
            "id": key.id,
            "name": key.name,
            "fingerprint": key.fingerprint,
            "public_key": key.public_key,
            "created_at": key.created_at
        }
        
        logger.info(f"Updated SSH key: {key.name} (ID: {key.id})")
        return {"ssh_key": ssh_key}
        
    except Exception as e:
        logger.error(f"Error updating SSH key {key_id}: {str(e)}")
        
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="SSH key not found")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to update SSH key: {str(e)}")

@router.delete("/ssh-keys/{key_id}")
async def delete_ssh_key(key_id: int):
    """Delete SSH key"""
    try:
        do_service = DigitalOceanService()
        
        # Get SSH keys from first available client
        clients = do_service.get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean tokens available")
        
        client = clients[0]  # Use first client
        
        # Delete SSH key
        client.ssh_keys.destroy(ssh_key_id=key_id)
        
        logger.info(f"Deleted SSH key ID: {key_id}")
        return {"message": "SSH key deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting SSH key {key_id}: {str(e)}")
        
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="SSH key not found")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to delete SSH key: {str(e)}")

@router.get("/ssh-keys/{key_id}")
async def get_ssh_key(key_id: int):
    """Get specific SSH key by ID"""
    try:
        do_service = DigitalOceanService()
        
        # Get SSH keys from first available client
        clients = do_service.get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean tokens available")
        
        client = clients[0]  # Use first client
        
        # Get SSH key
        key = client.ssh_keys.get(ssh_key_id=key_id)
        
        # Format response
        ssh_key = {
            "id": key.id,
            "name": key.name,
            "fingerprint": key.fingerprint,
            "public_key": key.public_key,
            "created_at": key.created_at
        }
        
        return {"ssh_key": ssh_key}
        
    except Exception as e:
        logger.error(f"Error getting SSH key {key_id}: {str(e)}")
        
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail="SSH key not found")
        else:
            raise HTTPException(status_code=500, detail=f"Failed to get SSH key: {str(e)}")
