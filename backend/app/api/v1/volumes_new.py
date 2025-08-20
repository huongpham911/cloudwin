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
