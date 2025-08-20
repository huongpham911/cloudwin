from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
import json
import logging
import pydo

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_do_clients():
    """Get DigitalOcean clients - standalone version"""
    try:
        # Read tokens from secure JSON file
        import os
        tokens_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "tokens_secure.json")

        if not os.path.exists(tokens_file):
            logger.error(f"❌ Tokens file not found: {tokens_file}")
            return []

        with open(tokens_file, 'r') as f:
            tokens_data = json.load(f)
        
        clients = []

        # Handle new secure format with users structure
        if 'users' in tokens_data:
            for user_id, user_data in tokens_data['users'].items():
                tokens = user_data.get('tokens', [])
                for i, token_data in enumerate(tokens):
                    if token_data.get('is_valid', True):
                        # Skip encrypted tokens for now (need decryption)
                        if 'encrypted_token' in token_data:
                            logger.warning(f"⚠️ Skipping encrypted token for user {user_id}")
                            continue
                        elif 'token' in token_data:
                            try:
                                client = pydo.Client(token=token_data['token'])
                                clients.append({
                                    'name': f"{user_id}_token_{i+1}",
                                    'client': client,
                                    'user_id': user_id,
                                    'token_name': token_data.get('name', f'Token {i+1}')
                                })
                                logger.info(f"✅ DigitalOcean client for {user_id} token {i+1} initialized")
                            except Exception as e:
                                logger.error(f"❌ Failed to initialize DigitalOcean client for {user_id}: {e}")
        else:
            # Fallback to old format
            for account_name, account_data in tokens_data.items():
                if isinstance(account_data, dict) and account_data.get('do_token'):
                    try:
                        client = pydo.Client(token=account_data['do_token'])
                        clients.append({
                            'name': account_name,
                            'client': client
                        })
                        logger.info(f"✅ DigitalOcean client for {account_name} initialized")
                    except Exception as e:
                        logger.error(f"❌ Failed to initialize DigitalOcean client for {account_name}: {e}")

        return clients
    except Exception as e:
        logger.error(f"❌ Failed to load DigitalOcean tokens: {e}")
        return []

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

# Use direct API calls instead of DigitalOceanService
def get_volume_operations():
    """Helper for volume operations using DO clients"""
    return get_do_clients()

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

@router.get("/{volume_id}", response_model=VolumeResponse)
async def get_volume(volume_id: str):
    """Get a specific volume"""
    try:
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                volume = client.volumes.get(volume_id)
                
                # Handle response format
                if hasattr(volume, 'volume'):
                    volume_data = volume.volume
                elif isinstance(volume, dict) and 'volume' in volume:
                    volume_data = volume['volume']
                else:
                    volume_data = volume
                
                return VolumeResponse(
                    id=volume_data.get('id') if isinstance(volume_data, dict) else volume_data.id,
                    name=volume_data.get('name') if isinstance(volume_data, dict) else volume_data.name,
                    size_gigabytes=volume_data.get('size_gigabytes') if isinstance(volume_data, dict) else volume_data.size_gigabytes,
                    region={
                        "name": volume_data.get('region', {}).get('name', '') if isinstance(volume_data, dict) else getattr(volume_data.region, 'name', ''),
                        "slug": volume_data.get('region', {}).get('slug', '') if isinstance(volume_data, dict) else getattr(volume_data.region, 'slug', '')
                    },
                    created_at=volume_data.get('created_at') if isinstance(volume_data, dict) else volume_data.created_at,
                    droplet_ids=volume_data.get('droplet_ids', []) if isinstance(volume_data, dict) else getattr(volume_data, 'droplet_ids', []),
                    filesystem_type=volume_data.get('filesystem_type', 'ext4') if isinstance(volume_data, dict) else getattr(volume_data, 'filesystem_type', 'ext4'),
                    filesystem_label=volume_data.get('filesystem_label', '') if isinstance(volume_data, dict) else getattr(volume_data, 'filesystem_label', ''),
                    description=volume_data.get('description', '') if isinstance(volume_data, dict) else getattr(volume_data, 'description', '')
                )
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to get volume: {e}")
                continue
        
        raise HTTPException(status_code=404, detail=f"Volume {volume_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get volume: {str(e)}")

@router.post("/", response_model=VolumeResponse)
async def create_volume(volume_request: CreateVolumeRequest):
    """Create a new volume"""
    try:
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        # Use first available client
        client = clients[0]['client']
        
        # Prepare volume creation request
        create_data = {
            "name": volume_request.name,
            "size_gigabytes": volume_request.size_gigabytes,
            "region": volume_request.region,
            "filesystem_type": volume_request.filesystem_type,
            "filesystem_label": volume_request.filesystem_label,
            "description": volume_request.description
        }
        
        response = client.volumes.create(body=create_data)
        
        # Handle response format
        if hasattr(response, 'volume'):
            volume_data = response.volume
        elif isinstance(response, dict) and 'volume' in response:
            volume_data = response['volume']
        else:
            volume_data = response
        
        return VolumeResponse(
            id=volume_data.get('id') if isinstance(volume_data, dict) else volume_data.id,
            name=volume_data.get('name') if isinstance(volume_data, dict) else volume_data.name,
            size_gigabytes=volume_data.get('size_gigabytes') if isinstance(volume_data, dict) else volume_data.size_gigabytes,
            region={
                "name": volume_data.get('region', {}).get('name', '') if isinstance(volume_data, dict) else getattr(volume_data.region, 'name', ''),
                "slug": volume_data.get('region', {}).get('slug', '') if isinstance(volume_data, dict) else getattr(volume_data.region, 'slug', '')
            },
            created_at=volume_data.get('created_at') if isinstance(volume_data, dict) else volume_data.created_at,
            droplet_ids=volume_data.get('droplet_ids', []) if isinstance(volume_data, dict) else getattr(volume_data, 'droplet_ids', []),
            filesystem_type=volume_data.get('filesystem_type', 'ext4') if isinstance(volume_data, dict) else getattr(volume_data, 'filesystem_type', 'ext4'),
            filesystem_label=volume_data.get('filesystem_label', '') if isinstance(volume_data, dict) else getattr(volume_data, 'filesystem_label', ''),
            description=volume_data.get('description', '') if isinstance(volume_data, dict) else getattr(volume_data, 'description', '')
        )
    except Exception as e:
        logger.error(f"❌ Failed to create volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create volume: {str(e)}")

@router.post("/{volume_id}/attach")
async def attach_volume(volume_id: str, attach_request: AttachVolumeRequest):
    """Attach volume to droplet"""
    try:
        logger.info(f"🔍 Attaching volume {volume_id} to droplet {attach_request.droplet_id}")
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

        droplet_id = int(attach_request.droplet_id)
        logger.info(f"🔍 Using droplet_id: {droplet_id}")

        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                logger.info(f"🔍 Trying account {i+1} to attach volume")

                # Try both formats to see which one works
                attach_body = {
                    "type": "attach",
                    "droplet": droplet_id
                }
                logger.info(f"🔍 Using attach body: {attach_body}")

                # Attach volume to droplet
                response = client.volume_actions.post(
                    volume_id=volume_id,
                    body=attach_body
                )
                logger.info(f"✅ Volume {volume_id} attached to droplet {droplet_id}")
                return {"success": True, "action": response}
            except Exception as e:
                logger.error(f"❌ Account {i+1} failed to attach volume: {e}")
                logger.error(f"❌ Error type: {type(e)}")
                continue

        raise HTTPException(status_code=500, detail="Failed to attach volume with any account")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to attach volume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to attach volume: {str(e)}")

@router.post("/{volume_id}/detach")
async def detach_volume(volume_id: str, detach_request: AttachVolumeRequest):
    """Detach volume from droplet"""
    try:
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        droplet_id = int(detach_request.droplet_id)
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                # Detach volume from droplet
                response = client.volume_actions.post(
                    volume_id=volume_id,
                    body={
                        "type": "detach",
                        "resource_id": droplet_id,
                        "resource_type": "droplet"
                    }
                )
                logger.info(f"✅ Volume {volume_id} detached from droplet {droplet_id}")
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
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                client.volumes.delete(volume_id)
                logger.info(f"✅ Volume {volume_id} deleted successfully")
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
                logger.info(f"✅ Volume {volume_id} resize initiated to {new_size} GB")
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
