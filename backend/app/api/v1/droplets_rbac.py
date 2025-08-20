"""
Role-aware Droplets API
Updates existing droplets API with role-based access control
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_admin
from app.models.auth_models import User
from app.models.droplet import Droplet
from app.utils.permissions import is_admin, get_user_scope
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ================================
# ROLE-AWARE DROPLET ENDPOINTS
# ================================

@router.get("/my-droplets")
async def get_user_droplets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get droplets for current user (User/Admin)"""
    user_scope = get_user_scope(current_user)
    
    if user_scope["can_access_all_droplets"]:
        # Admin can see all droplets
        droplets = db.query(Droplet).all()
        logger.info(f"Admin {current_user.email} retrieved {len(droplets)} total droplets")
    else:
        # User can only see own droplets
        droplets = db.query(Droplet).filter(Droplet.user_id == current_user.id).all()
        logger.info(f"User {current_user.email} retrieved {len(droplets)} own droplets")
    
    return {
        "droplets": [
            {
                "id": droplet.id,
                "droplet_id": droplet.droplet_id,
                "name": droplet.name,
                "status": droplet.status,
                "region": droplet.region,
                "size": droplet.size_slug,
                "image": droplet.image,
                "ip_address": droplet.ip_address,
                "vcpus": droplet.vcpus,
                "memory": droplet.memory,
                "disk": droplet.disk,
                "price_monthly": droplet.price_monthly,
                "price_hourly": droplet.price_hourly,
                "rdp_username": droplet.rdp_username,
                "created_at": droplet.created_at.isoformat() if droplet.created_at else None,
                "owner_id": droplet.user_id,
                "owner_email": droplet.owner.email if droplet.owner else None
            }
            for droplet in droplets
        ],
        "total": len(droplets),
        "scope": "all" if user_scope["can_access_all_droplets"] else "own"
    }

@router.get("/all-droplets")
async def get_all_droplets(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get all droplets with pagination (Admin only)"""
    
    # Build query
    query = db.query(Droplet)
    
    # Apply filters
    if status:
        query = query.filter(Droplet.status == status)
    
    if region:
        query = query.filter(Droplet.region == region)
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * size
    droplets = query.offset(offset).limit(size).all()
    
    # Calculate pages
    pages = (total + size - 1) // size
    
    return {
        "droplets": [
            {
                "id": droplet.id,
                "droplet_id": droplet.droplet_id,
                "name": droplet.name,
                "status": droplet.status,
                "region": droplet.region,
                "size": droplet.size_slug,
                "image": droplet.image,
                "ip_address": droplet.ip_address,
                "vcpus": droplet.vcpus,
                "memory": droplet.memory,
                "disk": droplet.disk,
                "price_monthly": droplet.price_monthly,
                "price_hourly": droplet.price_hourly,
                "rdp_username": droplet.rdp_username,
                "created_at": droplet.created_at.isoformat() if droplet.created_at else None,
                "owner_id": droplet.user_id,
                "owner_email": droplet.owner.email if droplet.owner else None
            }
            for droplet in droplets
        ],
        "total": total,
        "page": page,
        "size": size,
        "pages": pages
    }

@router.get("/{droplet_id}/details")
async def get_droplet_details(
    droplet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed droplet information (User: own only, Admin: any)"""
    
    droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
    if not droplet:
        raise HTTPException(status_code=404, detail="Droplet not found")
    
    # Check access permissions
    if not is_admin(current_user) and droplet.user_id != current_user.id:
        raise HTTPException(
            status_code=403, 
            detail="Access denied: You can only view your own droplets"
        )
    
    return {
        "id": droplet.id,
        "droplet_id": droplet.droplet_id,
        "name": droplet.name,
        "status": droplet.status,
        "region": droplet.region,
        "size": droplet.size_slug,
        "image": droplet.image,
        "ip_address": droplet.ip_address,
        "vcpus": droplet.vcpus,
        "memory": droplet.memory,
        "disk": droplet.disk,
        "price_monthly": droplet.price_monthly,
        "price_hourly": droplet.price_hourly,
        "rdp_username": droplet.rdp_username,
        "rdp_password": droplet.rdp_password,
        "created_at": droplet.created_at.isoformat() if droplet.created_at else None,
        "updated_at": droplet.updated_at.isoformat() if droplet.updated_at else None,
        "owner_id": droplet.user_id,
        "owner_email": droplet.owner.email if droplet.owner else None,
        "owner_name": droplet.owner.full_name if droplet.owner else None
    }

@router.delete("/{droplet_id}")
async def delete_droplet(
    droplet_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete droplet (User: own only, Admin: any)"""
    
    droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
    if not droplet:
        raise HTTPException(status_code=404, detail="Droplet not found")
    
    # Check access permissions
    if not is_admin(current_user) and droplet.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Access denied: You can only delete your own droplets"
        )
    
    droplet_name = droplet.name
    owner_email = droplet.owner.email if droplet.owner else "unknown"
    
    db.delete(droplet)
    db.commit()
    
    logger.info(f"User {current_user.email} deleted droplet {droplet_name} (owner: {owner_email})")
    
    return {
        "message": f"Droplet {droplet_name} deleted successfully",
        "droplet_id": droplet_id
    }

# ================================
# ADMIN-ONLY DROPLET MANAGEMENT
# ================================

@router.get("/stats")
async def get_droplet_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Get droplet statistics (Admin only)"""
    
    from sqlalchemy import func
    
    # Total droplets
    total_droplets = db.query(Droplet).count()
    
    # Status distribution
    status_stats = db.query(
        Droplet.status,
        func.count(Droplet.id)
    ).group_by(Droplet.status).all()
    
    # Region distribution
    region_stats = db.query(
        Droplet.region,
        func.count(Droplet.id)
    ).group_by(Droplet.region).all()
    
    # Size distribution
    size_stats = db.query(
        Droplet.size_slug,
        func.count(Droplet.id)
    ).group_by(Droplet.size_slug).all()
    
    # User distribution
    user_stats = db.query(
        Droplet.user_id,
        func.count(Droplet.id)
    ).group_by(Droplet.user_id).limit(10).all()
    
    return {
        "total_droplets": total_droplets,
        "status_distribution": {status: count for status, count in status_stats},
        "region_distribution": {region: count for region, count in region_stats},
        "size_distribution": {size: count for size, count in size_stats},
        "top_users": [
            {
                "user_id": user_id,
                "droplet_count": count
            }
            for user_id, count in user_stats
        ]
    }

@router.post("/{droplet_id}/reassign")
async def reassign_droplet(
    droplet_id: str,
    new_owner_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Reassign droplet to different user (Admin only)"""
    
    droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
    if not droplet:
        raise HTTPException(status_code=404, detail="Droplet not found")
    
    new_owner = db.query(User).filter(User.id == new_owner_id).first()
    if not new_owner:
        raise HTTPException(status_code=404, detail="New owner not found")
    
    old_owner_email = droplet.owner.email if droplet.owner else "unknown"
    droplet.user_id = new_owner_id
    db.commit()
    
    logger.info(f"Admin {admin_user.email} reassigned droplet {droplet.name} from {old_owner_email} to {new_owner.email}")
    
    return {
        "message": f"Droplet reassigned from {old_owner_email} to {new_owner.email}",
        "droplet_id": droplet_id,
        "old_owner": old_owner_email,
        "new_owner": new_owner.email
    }


# ================================
# DIGITALOCEAN RESOURCES ENDPOINTS
# ================================

# Import DigitalOcean service
import json
from pydo import Client

# Initialize DO clients (same as droplets.py)
do_clients = []

def load_tokens():
    """Load tokens from tokens_secure.json file"""
    import os
    user_tokens = []
    current_dir = os.getcwd()
    logger.info(f"🔍 Current working directory: {current_dir}")

    try:
        # Try multiple paths for tokens_secure.json
        token_paths = [
            'tokens_secure.json',
            'backend/tokens_secure.json',
            '../tokens_secure.json',
            '../../tokens_secure.json',
            os.path.join(current_dir, 'tokens_secure.json'),
            os.path.join(current_dir, 'backend', 'tokens_secure.json')
        ]

        for path in token_paths:
            try:
                logger.info(f"🔍 Trying path: {path}")
                with open(path, 'r') as f:
                    data = json.load(f)
                    # Handle new secure format with users structure
                    if 'users' in data:
                        # Extract tokens from all users
                        user_tokens = []
                        for user_id, user_data in data['users'].items():
                            tokens = user_data.get('tokens', [])
                            for token_data in tokens:
                                if token_data.get('is_valid', True):
                                    # Extract the actual token from encrypted format
                                    if 'encrypted_token' in token_data:
                                        # For now, skip encrypted tokens in this legacy function
                                        continue
                                    elif 'token' in token_data:
                                        user_tokens.append(token_data['token'])
                    else:
                        # Fallback to old format
                        user_tokens = data.get('tokens', [])
                logger.info(f"✅ Loaded tokens from {path}, total: {len(user_tokens)}")
                break
            except FileNotFoundError:
                logger.info(f"❌ File not found: {path}")
                continue
            except Exception as e:
                logger.warning(f"❌ Error reading {path}: {e}")
                continue

        if not user_tokens:
            logger.warning(f"⚠️ No tokens found in any of: {token_paths}")
            return

    except Exception as e:
        logger.warning(f"⚠️ Could not load tokens_secure.json: {e}")
        return
    
    # Initialize DigitalOcean clients
    for i, token in enumerate(user_tokens):
        try:
            client = Client(token=token)
            # Mask token - chỉ hiển thị 10 ký tự cuối
            masked_token = f"***...{token[-10:]}" if len(token) >= 10 else token
            do_clients.append({
                'client': client,
                'token': token,
                'masked_token': masked_token
            })
            logger.info(f"✅ Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize DO client {i+1}: {e}")
    
    logger.info(f"✅ Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup using secure service
def load_tokens_secure():
    """Load tokens from enhanced secure token service"""
    global do_clients
    do_clients = []
    user_tokens = []

    try:
        from app.services.enhanced_token_service import enhanced_token_service
        user_tokens = enhanced_token_service.get_all_valid_tokens()
        logger.info(f"✅ Droplets RBAC - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Droplets RBAC - Could not load secure tokens: {e}")

    # Initialize DigitalOcean clients
    for i, token in enumerate(user_tokens):
        try:
            client = Client(token=token)
            masked_token = f"***...{token[-10:]}" if len(token) >= 10 else token
            do_clients.append({
                'client': client,
                'token': token,
                'masked_token': masked_token
            })
            logger.info(f"✅ Droplets RBAC - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Droplets RBAC - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Droplets RBAC - Total {len(do_clients)} DigitalOcean clients ready")

load_tokens_secure()

@router.get("/debug")
async def debug_info():
    """Debug endpoint to check DigitalOcean clients"""
    return {
        "do_clients_count": len(do_clients),
        "clients_info": [
            {
                "token_masked": client['masked_token']
            } for client in do_clients
        ]
    }

@router.get("/reload-tokens")
async def reload_tokens():
    """Force reload tokens from secure storage"""
    global do_clients
    do_clients.clear()
    load_tokens_secure()
    return {
        "message": "Secure tokens reloaded",
        "do_clients_count": len(do_clients)
    }

@router.get("/regions")
async def get_regions():
    """Get real regions from DigitalOcean API"""

    
    if not do_clients:
        logger.error("❌ No DigitalOcean clients available - calling load_tokens again")
        load_tokens()  # Try to reload tokens
        if not do_clients:
            raise HTTPException(status_code=404, detail="No DigitalOcean clients available")
        raise HTTPException(status_code=404, detail="No DigitalOcean clients available")

    try:
        logger.info("🌍 Fetching real regions from DigitalOcean...")
        # Use first client for regions (same across all accounts)
        client = do_clients[0]['client']
        response = client.regions.list()

        # PyDO returns dict with regions key
        regions = []
        if isinstance(response, dict) and 'regions' in response:
            for region in response['regions']:
                regions.append({
                    'slug': region['slug'],
                    'name': region['name'],
                    'available': region.get('available', True),
                    'features': region.get('features', [])
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=404, detail="Droplet regions not found in any account")

        logger.info(f"✅ Retrieved {len(regions)} real regions")
        return {
            "regions": regions,
            "links": {},
            "meta": {"total": len(regions)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch regions: {e}")
        raise HTTPException(status_code=404, detail="Droplet regions not found in any account")

@router.get("/sizes")
async def get_sizes():
    """Get real sizes from DigitalOcean API"""
    if not do_clients:
        raise HTTPException(status_code=404, detail="No DigitalOcean clients available")
    
    try:
        logger.info("📦 Fetching real sizes from DigitalOcean...")
        # Use first client for sizes
        client = do_clients[0]['client']
        response = client.sizes.list()
        
        # PyDO returns dict with sizes key
        sizes = []
        if isinstance(response, dict) and 'sizes' in response:
            for size in response['sizes']:
                sizes.append({
                    'slug': size['slug'],
                    'memory': size['memory'],
                    'vcpus': size['vcpus'],
                    'disk': size['disk'],
                    'transfer': size.get('transfer', 0),
                    'price_monthly': str(size.get('price_monthly', 0)),
                    'price_hourly': str(size.get('price_hourly', 0)),
                    'available': size.get('available', True),
                    'regions': size.get('regions', []),
                    'description': f"{size['vcpus']} vCPU, {size['memory']//1024}GB RAM, {size['disk']}GB SSD"
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=404, detail="Droplet sizes not found in any account")
        
        logger.info(f"✅ Retrieved {len(sizes)} real sizes")
        return {
            "sizes": sizes,
            "links": {},
            "meta": {"total": len(sizes)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch sizes: {e}")
        raise HTTPException(status_code=404, detail="Droplet sizes not found in any account")

    except Exception as e:
        logger.error(f"❌ Failed to fetch sizes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sizes: {str(e)}")

@router.get("/images")
async def get_images(type: str = "distribution"):
    """Get real images from DigitalOcean API"""
    if not do_clients:
        raise HTTPException(status_code=404, detail="No DigitalOcean clients available")

    try:
        logger.info(f"💿 Fetching real images from DigitalOcean (type: {type})...")
        # Use first client for images
        client = do_clients[0]['client']
        
        # Fetch images based on type
        if type == "distribution":
            response = client.images.list(type="distribution")
        elif type == "application":
            response = client.images.list(type="application")
        else:
            # Get all images if no specific type
            response = client.images.list()
        
        # PyDO returns dict with images key
        images = []
        if isinstance(response, dict) and 'images' in response:
            for image in response['images']:
                images.append({
                    'id': image['id'],
                    'name': image['name'],
                    'distribution': image.get('distribution', ''),
                    'slug': image.get('slug', ''),
                    'public': image.get('public', True),
                    'regions': image.get('regions', []),
                    'type': image.get('type', ''),
                    'description': image.get('description', '')
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=404, detail="Droplet images not found in any account")

        logger.info(f"✅ Retrieved {len(images)} real images (type: {type})")
        return {
            "images": images,
            "links": {},
            "meta": {"total": len(images)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch images: {e}")
        raise HTTPException(status_code=404, detail="Droplet images not found in any account")

# ================================
# VOLUME ENDPOINTS
# ================================

def get_do_clients():
    """Get DigitalOcean clients from droplets module"""
    try:
        from app.api.v1.droplets import get_do_clients as get_droplet_clients
        return get_droplet_clients()
    except ImportError:
        # Fallback if droplets module is not available
        return []

@router.get("/{droplet_id}/volumes")
async def get_droplet_volumes(
    droplet_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get volumes attached to a specific droplet (User/Admin)"""
    try:
        logger.info(f"🔍 Getting volumes for droplet {droplet_id}")
        clients = get_do_clients()
        
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        for i, client_info in enumerate(clients):
            try:
                client = client_info['client']
                
                # Get all volumes and filter by droplet_id
                volumes_response = client.volumes.list()
                volumes = volumes_response.get('volumes', [])
                
                # Filter volumes attached to this droplet
                attached_volumes = []
                for volume in volumes:
                    if volume.get('droplet_ids') and int(droplet_id) in volume.get('droplet_ids', []):
                        attached_volumes.append({
                            "id": volume.get('id'),
                            "name": volume.get('name'),
                            "size_gigabytes": volume.get('size_gigabytes'),
                            "region": volume.get('region', {}),
                            "created_at": volume.get('created_at'),
                            "droplet_ids": volume.get('droplet_ids', []),
                            "filesystem_type": volume.get('filesystem_type'),
                            "filesystem_label": volume.get('filesystem_label'),
                            "description": volume.get('description', '')
                        })
                
                logger.info(f"✅ Found {len(attached_volumes)} volumes for droplet {droplet_id}")
                return attached_volumes
                
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to get droplet volumes: {e}")
                continue
        
        # If no accounts worked, return empty list
        logger.info(f"ℹ️ No volumes found for droplet {droplet_id}")
        return []
        
    except Exception as e:
        logger.error(f"❌ Failed to get volumes for droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get droplet volumes: {str(e)}")