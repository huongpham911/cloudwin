from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_do_clients():
    """Get DigitalOcean clients from droplets module"""
    from app.api.v1.droplets import get_do_clients as get_droplet_clients
    return get_droplet_clients()

class CreateVolumeRequest(BaseModel):
    name: str
    size_gigabytes: int
    region: Optional[str] = "sgp1"
    filesystem_type: Optional[str] = "ext4"
    filesystem_label: Optional[str] = ""
    description: Optional[str] = ""

class AttachVolumeRequest(BaseModel):
    droplet_id: str

class VolumeResponse(BaseModel):
    id: str
    name: str
    size_gigabytes: int
    region: dict
    created_at: str
    droplet_ids: List[int]
    filesystem_type: str
    filesystem_label: str
    description: Optional[str] = ""

@router.get("/")
async def get_volumes():
    """Get all volumes"""
    try:
        logger.info("🔍 Getting all volumes")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Get all volumes
                volumes_response = client.volumes.list()
                volumes = volumes_response.get('volumes', [])
                
                # Format response
                formatted_volumes = []
                for volume in volumes:
                    formatted_volumes.append({
                        "id": volume.get('id'),
                        "name": volume.get('name'),
                        "size_gigabytes": volume.get('size_gigabytes'),
                        "region": volume.get('region', {}),
                        "created_at": volume.get('created_at'),
                        "droplet_ids": volume.get('droplet_ids', []),
                        "filesystem_type": volume.get('filesystem_type', 'ext4'),
                        "filesystem_label": volume.get('filesystem_label', ''),
                        "description": volume.get('description', '')
                    })
                
                logger.info(f"✅ Found {len(formatted_volumes)} volumes")
                return formatted_volumes
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to get volumes: {e}")
                continue
        
        # If no accounts worked, return empty list
        logger.info("ℹ️ No volumes found")
        return []
        
    except Exception as e:
        logger.error(f"❌ Failed to get volumes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get volumes: {str(e)}")

@router.get("/{volume_id}")
async def get_volume(volume_id: str):
    """Get a specific volume"""
    try:
        logger.info(f"🔍 Getting volume {volume_id}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Get specific volume
                volume_response = client.volumes.get(volume_id)
                volume = volume_response.get('volume', {})
                
                if volume:
                    formatted_volume = {
                        "id": volume.get('id'),
                        "name": volume.get('name'),
                        "size_gigabytes": volume.get('size_gigabytes'),
                        "region": volume.get('region', {}),
                        "created_at": volume.get('created_at'),
                        "droplet_ids": volume.get('droplet_ids', []),
                        "filesystem_type": volume.get('filesystem_type', 'ext4'),
                        "filesystem_label": volume.get('filesystem_label', ''),
                        "description": volume.get('description', '')
                    }
                    
                    logger.info(f"✅ Found volume {volume_id}")
                    return formatted_volume
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to get volume: {e}")
                continue
        
        raise HTTPException(status_code=404, detail=f"Volume {volume_id} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get volume {volume_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get volume: {str(e)}")

@router.post("/")
async def create_volume(volume_request: CreateVolumeRequest):
    """Create a new volume"""
    try:
        logger.info(f"🔍 Creating volume {volume_request.name}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Create volume
                volume_data = {
                    "name": volume_request.name,
                    "size_gigabytes": volume_request.size_gigabytes,
                    "region": volume_request.region,
                    "filesystem_type": volume_request.filesystem_type
                }
                
                if volume_request.filesystem_label:
                    volume_data["filesystem_label"] = volume_request.filesystem_label
                if volume_request.description:
                    volume_data["description"] = volume_request.description
                
                response = client.volumes.create(body=volume_data)
                volume = response.get('volume', {})
                
                if volume:
                    formatted_volume = {
                        "id": volume.get('id'),
                        "name": volume.get('name'),
                        "size_gigabytes": volume.get('size_gigabytes'),
                        "region": volume.get('region', {}),
                        "created_at": volume.get('created_at'),
                        "droplet_ids": volume.get('droplet_ids', []),
                        "filesystem_type": volume.get('filesystem_type', 'ext4'),
                        "filesystem_label": volume.get('filesystem_label', ''),
                        "description": volume.get('description', '')
                    }
                    
                    logger.info(f"✅ Created volume {volume_request.name}")
                    return formatted_volume
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to create volume: {e}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to create volume with any account")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create volume: {str(e)}")

@router.post("/{volume_id}/attach")
async def attach_volume(volume_id: str, request: AttachVolumeRequest):
    """Attach volume to droplet"""
    try:
        logger.info(f"🔍 Attaching volume {volume_id} to droplet {request.droplet_id}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Attach volume
                response = client.volume_actions.post(
                    volume_id=volume_id,
                    body={
                        "type": "attach",
                        "droplet": int(request.droplet_id)
                    }
                )
                
                logger.info(f"✅ Attached volume {volume_id} to droplet {request.droplet_id}")
                return {"success": True, "action": response}
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to attach volume: {e}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to attach volume with any account")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to attach volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to attach volume: {str(e)}")

@router.post("/{volume_id}/detach")
async def detach_volume(volume_id: str):
    """Detach volume from droplet"""
    try:
        logger.info(f"🔍 Detaching volume {volume_id}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Detach volume
                response = client.volume_actions.post(
                    volume_id=volume_id,
                    body={"type": "detach"}
                )
                
                logger.info(f"✅ Detached volume {volume_id}")
                return {"success": True, "action": response}
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to detach volume: {e}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to detach volume with any account")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to detach volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to detach volume: {str(e)}")

@router.delete("/{volume_id}")
async def delete_volume(volume_id: str):
    """Delete a volume"""
    try:
        logger.info(f"🔍 Deleting volume {volume_id}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Delete volume
                response = client.volumes.delete(volume_id)
                
                logger.info(f"✅ Deleted volume {volume_id}")
                return {"success": True, "message": f"Volume {volume_id} deleted"}
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to delete volume: {e}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to delete volume with any account")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete volume: {str(e)}")

@router.post("/{volume_id}/resize")
async def resize_volume(volume_id: str, resize_request: dict):
    """Resize a volume"""
    try:
        new_size = resize_request.get("size_gigabytes")
        if not new_size:
            raise HTTPException(status_code=400, detail="size_gigabytes is required")
        
        logger.info(f"🔍 Resizing volume {volume_id} to {new_size}GB")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Resize volume
                response = client.volume_actions.post(
                    volume_id=volume_id,
                    body={
                        "type": "resize",
                        "size_gigabytes": new_size
                    }
                )
                
                logger.info(f"✅ Resized volume {volume_id} to {new_size}GB")
                return {"success": True, "action": response}
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to resize volume: {e}")
                continue
        
        raise HTTPException(status_code=500, detail="Failed to resize volume with any account")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to resize volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resize volume: {str(e)}")
