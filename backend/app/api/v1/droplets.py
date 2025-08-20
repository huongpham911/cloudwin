from fastapi import APIRouter, HTTPException, Depends
from pydo import Client
import logging
import os
import json
import asyncio
import asyncssh
from app.models.droplet import Droplet
from app.core.database import get_db
from app.core.security import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
logger = logging.getLogger(__name__)

router = APIRouter()

# Global variables for DigitalOcean clients
do_clients = []

def set_do_clients(clients):
    """Set DigitalOcean clients from main app"""
    global do_clients
    do_clients = clients
    logger.info(f"✅ Received {len(do_clients)} DigitalOcean clients from main app")

def get_do_clients():
    """Get DigitalOcean clients"""
    global do_clients
    return do_clients

def load_tokens_secure():
    """Load tokens from enhanced secure token service"""
    user_tokens = []
    try:
        from app.services.enhanced_token_service import enhanced_token_service
        user_tokens = enhanced_token_service.get_all_valid_tokens()
        logger.info(f"✅ Droplets API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Droplets API - Could not load secure tokens: {e}")

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
            logger.info(f"✅ Droplets API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Droplets API - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Droplets API - Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup
load_tokens_secure()

@router.get("/")
async def list_droplets(db=Depends(get_db), current_user=Depends(get_current_user)):
    """Get real droplets from ALL DigitalOcean accounts"""
    if not do_clients:
        return []

    try:
        logger.info("🖥️ Fetching real droplets from ALL DigitalOcean accounts...")
        all_droplets = []
        for i, client_info in enumerate(do_clients):
            try:
                response = client_info['client'].droplets.list()
                if isinstance(response, dict) and 'droplets' in response:
                    droplets = response['droplets']
                elif hasattr(response, 'droplets'):
                    droplets = response.droplets
                else:
                    droplets = []
                # Add account info to each droplet and serialize
                for droplet in droplets:
                    droplet_dict = serialize_droplet(droplet)
                    droplet_dict['account_id'] = i
                    droplet_dict['account_token'] = client_info['masked_token']
                    # Nếu là admin thì join user_id từ DB
                    if hasattr(current_user, 'is_admin') and current_user.is_admin:
                        do_id = droplet_dict.get('id') or droplet_dict.get('do_droplet_id')
                        db_droplet = db.query(Droplet).filter(Droplet.do_droplet_id == do_id).first()
                        if db_droplet:
                            droplet_dict['user_id'] = db_droplet.user_id
                    all_droplets.append(droplet_dict)
                logger.info(f"✅ Account {i+1}: {len(droplets)} droplets")
            except Exception as e:
                logger.error(f"❌ Error fetching droplets from account {i+1}: {e}")
        logger.info(f"✅ Total retrieved: {len(all_droplets)} droplets from {len(do_clients)} accounts")
        return all_droplets
    except Exception as e:
        logger.error(f"❌ Failed to fetch droplets: {e}")
        return []

@router.post("/")
async def create_droplet(request_body: dict):
    """Create a new droplet with comprehensive parameters"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("🚀 Creating new droplet...")
        logger.info(f"📝 Request: {request_body}")
        
        # Get account index (default to 0 if not specified)
        account_id = request_body.get('account_id', 0)
        if account_id >= len(do_clients):
            raise HTTPException(status_code=400, detail=f"Invalid account_id: {account_id}")
        
        client = do_clients[account_id]['client']
        
        # Validate required parameters
        required_fields = ['name', 'region', 'size', 'image']
        for field in required_fields:
            if field not in request_body:
                raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
        
        # Build droplet creation request
        droplet_request = {
            "name": request_body['name'],
            "region": request_body['region'],
            "size": request_body['size'],
            "image": request_body['image']
        }
        
        # Add optional parameters
        if 'ssh_keys' in request_body and request_body['ssh_keys']:
            droplet_request['ssh_keys'] = request_body['ssh_keys']
        
        if 'backups' in request_body:
            droplet_request['backups'] = request_body['backups']
        
        if 'ipv6' in request_body:
            droplet_request['ipv6'] = request_body['ipv6']
        
        if 'monitoring' in request_body:
            droplet_request['monitoring'] = request_body['monitoring']
        
        if 'tags' in request_body and request_body['tags']:
            droplet_request['tags'] = request_body['tags']
        
        if 'user_data' in request_body and request_body['user_data']:
            droplet_request['user_data'] = request_body['user_data']
        
        if 'vpc_uuid' in request_body and request_body['vpc_uuid']:
            droplet_request['vpc_uuid'] = request_body['vpc_uuid']
        
        if 'volumes' in request_body and request_body['volumes']:
            droplet_request['volumes'] = request_body['volumes']
        
        logger.info(f"🛠️ Creating droplet with config: {droplet_request}")
        
        # Create droplet using PyDo
        response = client.droplets.create(body=droplet_request)
        
        if isinstance(response, dict):
            if 'droplet' in response:
                created_droplet = response['droplet']
                logger.info(f"✅ Droplet created successfully: {created_droplet.get('name')} (ID: {created_droplet.get('id')})")
                return {
                    "success": True,
                    "droplet": created_droplet,
                    "message": f"Droplet '{created_droplet.get('name')}' created successfully"
                }
            else:
                logger.info(f"✅ Droplet creation response: {response}")
                return {"success": True, "response": response}
        else:
            logger.info(f"✅ Droplet created: {response}")
            return {"success": True, "droplet": response}
            
    except Exception as e:
        logger.error(f"❌ Failed to create droplet: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create droplet: {str(e)}")

# Helper function to serialize droplet object
def serialize_droplet(droplet):
    """Convert PyDo droplet object to dict format"""
    if isinstance(droplet, dict):
        return droplet
    
    # Convert PyDo object to dict
    droplet_dict = {}
    
    # Basic fields
    for field in ['id', 'name', 'status', 'memory', 'vcpus', 'disk', 'size_slug', 'created_at', 'locked']:
        if hasattr(droplet, field):
            droplet_dict[field] = getattr(droplet, field)
    
    # Region object
    if hasattr(droplet, 'region'):
        region = getattr(droplet, 'region')
        if isinstance(region, dict):
            droplet_dict['region'] = region
        else:
            droplet_dict['region'] = {
                'name': getattr(region, 'name', ''),
                'slug': getattr(region, 'slug', ''),
                'features': getattr(region, 'features', []),
                'available': getattr(region, 'available', True),
                'sizes': getattr(region, 'sizes', [])
            }
    
    # Size object
    if hasattr(droplet, 'size'):
        size = getattr(droplet, 'size')
        if isinstance(size, dict):
            droplet_dict['size'] = size
        else:
            droplet_dict['size'] = {
                'slug': getattr(size, 'slug', ''),
                'memory': getattr(size, 'memory', 0),
                'vcpus': getattr(size, 'vcpus', 0),
                'disk': getattr(size, 'disk', 0),
                'transfer': getattr(size, 'transfer', 0),
                'price_monthly': getattr(size, 'price_monthly', 0),
                'price_hourly': getattr(size, 'price_hourly', 0),
                'regions': getattr(size, 'regions', []),
                'available': getattr(size, 'available', True)
            }
    
    # Image object
    if hasattr(droplet, 'image'):
        image = getattr(droplet, 'image')
        if isinstance(image, dict):
            droplet_dict['image'] = image
        else:
            droplet_dict['image'] = {
                'id': getattr(image, 'id', 0),
                'name': getattr(image, 'name', ''),
                'distribution': getattr(image, 'distribution', ''),
                'slug': getattr(image, 'slug', ''),
                'public': getattr(image, 'public', True),
                'regions': getattr(image, 'regions', []),
                'created_at': getattr(image, 'created_at', '')
            }
    
    # Networks object
    if hasattr(droplet, 'networks'):
        networks = getattr(droplet, 'networks')
        if isinstance(networks, dict):
            droplet_dict['networks'] = networks
        else:
            droplet_dict['networks'] = {
                'v4': getattr(networks, 'v4', []),
                'v6': getattr(networks, 'v6', [])
            }
    
    # Array fields
    for field in ['features', 'backup_ids', 'snapshot_ids', 'volume_ids', 'tags']:
        if hasattr(droplet, field):
            droplet_dict[field] = getattr(droplet, field, [])
    
    # Optional fields
    for field in ['kernel', 'next_backup_window', 'vpc_uuid']:
        if hasattr(droplet, field):
            droplet_dict[field] = getattr(droplet, field)
    
    return droplet_dict

@router.get("/{droplet_id}")
async def get_droplet(droplet_id: str):
    """Get detailed droplet information"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info(f"🔍 Fetching droplet details for ID: {droplet_id}")
        
        # Try to find droplet across all accounts
        for i, client_info in enumerate(do_clients):
            try:
                logger.info(f"🔍 Searching droplet {droplet_id} in account {i+1}")
                response = client_info['client'].droplets.list()
                
                # Extract droplets from response
                if hasattr(response, 'droplets'):
                    droplets = response.droplets
                elif isinstance(response, dict) and 'droplets' in response:
                    droplets = response['droplets']
                else:
                    logger.warning(f"⚠️ Unexpected response format in account {i+1}")
                    continue
                
                # Find the specific droplet
                target_droplet = None
                for droplet in droplets:
                    droplet_id_val = droplet.get('id') if isinstance(droplet, dict) else getattr(droplet, 'id', None)
                    if str(droplet_id_val) == str(droplet_id):
                        target_droplet = droplet
                        break
                
                if target_droplet is None:
                    logger.info(f"📋 Droplet {droplet_id} not found in account {i+1}")
                    continue
                
                logger.info(f"✅ Found droplet {droplet_id} in account {i+1}")
                
                # Serialize droplet to dict format
                droplet_dict = serialize_droplet(target_droplet)
                
                # Add account info
                droplet_dict['account_id'] = i
                droplet_dict['account_token'] = client_info['masked_token']
                
                logger.info(f"📋 Returning droplet data: {droplet_dict.get('name')} - Status: {droplet_dict.get('status')}")
                return droplet_dict
                
            except Exception as e:
                logger.error(f"❌ Error searching droplet {droplet_id} in account {i+1}: {e}")
                continue
        
        raise HTTPException(status_code=404, detail=f"Droplet {droplet_id} not found in any account")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch droplet: {str(e)}")

# DigitalOcean resource endpoints for Create VPS form
@router.get("/resources/regions")
async def get_regions():
    """Get real regions from DigitalOcean API"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("🌍 Fetching real regions from DigitalOcean...")
        # Use first client for regions (same across all accounts)
        client = do_clients[0]['client']
        response = client.regions.list()

        # Handle dict response
        if isinstance(response, dict) and 'regions' in response:
            regions = response['regions']
        elif hasattr(response, 'regions'):
            regions = response.regions
        else:
            regions = []

        # Format regions for frontend
        formatted_regions = []
        for region in regions:
            if isinstance(region, dict):
                formatted_regions.append({
                    'slug': region.get('slug'),
                    'name': region.get('name'),
                    'available': region.get('available', True),
                    'features': region.get('features', [])
                })
            else:
                formatted_regions.append({
                    'slug': getattr(region, 'slug', ''),
                    'name': getattr(region, 'name', ''),
                    'available': getattr(region, 'available', True),
                    'features': getattr(region, 'features', [])
                })

        logger.info(f"✅ Retrieved {len(formatted_regions)} real regions")
        return {
            "regions": formatted_regions,
            "links": {},
            "meta": {"total": len(formatted_regions)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch regions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch regions: {str(e)}")

@router.get("/resources/sizes")
async def get_sizes():
    """Get real sizes from DigitalOcean API"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
    
    try:
        logger.info("📦 Fetching real sizes from DigitalOcean...")
        # Use first client for sizes
        client = do_clients[0]['client']
        response = client.sizes.list()
        
        # Handle dict response
        if isinstance(response, dict) and 'sizes' in response:
            sizes = response['sizes']
        elif hasattr(response, 'sizes'):
            sizes = response.sizes
        else:
            sizes = []
        
        # Format sizes for frontend
        formatted_sizes = []
        for size in sizes:
            if isinstance(size, dict):
                formatted_sizes.append({
                    'slug': size.get('slug'),
                    'memory': size.get('memory'),
                    'vcpus': size.get('vcpus'),
                    'disk': size.get('disk'),
                    'transfer': size.get('transfer', 0),
                    'price_monthly': str(size.get('price_monthly', 0)),
                    'price_hourly': str(size.get('price_hourly', 0)),
                    'available': size.get('available', True),
                    'regions': size.get('regions', []),
                    'description': f"{size.get('vcpus', 0)} vCPU, {size.get('memory', 0)//1024}GB RAM, {size.get('disk', 0)}GB SSD"
                })
            else:
                formatted_sizes.append({
                    'slug': getattr(size, 'slug', ''),
                    'memory': getattr(size, 'memory', 0),
                    'vcpus': getattr(size, 'vcpus', 0),
                    'disk': getattr(size, 'disk', 0),
                    'transfer': getattr(size, 'transfer', 0),
                    'price_monthly': str(getattr(size, 'price_monthly', 0)),
                    'price_hourly': str(getattr(size, 'price_hourly', 0)),
                    'available': getattr(size, 'available', True),
                    'regions': getattr(size, 'regions', []),
                    'description': f"{getattr(size, 'vcpus', 0)} vCPU, {getattr(size, 'memory', 0)//1024}GB RAM, {getattr(size, 'disk', 0)}GB SSD"
                })
        
        logger.info(f"✅ Retrieved {len(formatted_sizes)} real sizes")
        return {
            "sizes": formatted_sizes,
            "links": {},
            "meta": {"total": len(formatted_sizes)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch sizes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sizes: {str(e)}")

@router.get("/resources/images")
async def get_images(type: str = "distribution"):
    """Get real images from DigitalOcean API"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info(f"💿 Fetching real images from DigitalOcean (type: {type})...")
        # Use first client for images
        client = do_clients[0]['client']
        
        # Fetch both distribution and application images
        all_images = []
        
        # Get distribution images
        dist_response = client.images.list(type="distribution")
        if isinstance(dist_response, dict) and 'images' in dist_response:
            all_images.extend(dist_response['images'])
        elif hasattr(dist_response, 'images'):
            all_images.extend(dist_response.images)
        
        # Get application images
        app_response = client.images.list(type="application")
        if isinstance(app_response, dict) and 'images' in app_response:
            all_images.extend(app_response['images'])
        elif hasattr(app_response, 'images'):
            all_images.extend(app_response.images)

        # Filter by type if specified
        if type == "distribution":
            filtered_images = [img for img in all_images if (img.get('type') if isinstance(img, dict) else getattr(img, 'type', '')) == 'distribution']
        elif type == "application":
            filtered_images = [img for img in all_images if (img.get('type') if isinstance(img, dict) else getattr(img, 'type', '')) == 'application']
        else:
            filtered_images = all_images

        # Format images for frontend
        formatted_images = []
        for image in filtered_images:
            if isinstance(image, dict):
                formatted_images.append({
                    'id': image.get('id'),
                    'name': image.get('name'),
                    'distribution': image.get('distribution', ''),
                    'slug': image.get('slug', ''),
                    'public': image.get('public', True),
                    'regions': image.get('regions', []),
                    'type': image.get('type', ''),
                    'description': image.get('description', '')
                })
            else:
                formatted_images.append({
                    'id': getattr(image, 'id', 0),
                    'name': getattr(image, 'name', ''),
                    'distribution': getattr(image, 'distribution', ''),
                    'slug': getattr(image, 'slug', ''),
                    'public': getattr(image, 'public', True),
                    'regions': getattr(image, 'regions', []),
                    'type': getattr(image, 'type', ''),
                    'description': getattr(image, 'description', '')
                })

        logger.info(f"✅ Retrieved {len(formatted_images)} real images (filtered)")
        return {
            "images": formatted_images,
            "links": {},
            "meta": {"total": len(formatted_images)}
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch images: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch images: {str(e)}")

@router.get("/resources/ssh_keys")
async def get_ssh_keys():
    """Get SSH keys for droplet creation"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("🔑 Fetching SSH keys from DigitalOcean...")
        all_ssh_keys = []
        
        for i, client_info in enumerate(do_clients):
            try:
                response = client_info['client'].ssh_keys.list()
                
                if isinstance(response, dict) and 'ssh_keys' in response:
                    ssh_keys = response['ssh_keys']
                elif hasattr(response, 'ssh_keys'):
                    ssh_keys = response.ssh_keys
                else:
                    ssh_keys = []
                
                # Add account info
                for key in ssh_keys:
                    if isinstance(key, dict):
                        key['account_id'] = i
                    else:
                        setattr(key, 'account_id', i)
                
                all_ssh_keys.extend(ssh_keys)
                logger.info(f"✅ Account {i+1}: {len(ssh_keys)} SSH keys")
                
            except Exception as e:
                logger.error(f"❌ Error fetching SSH keys from account {i+1}: {e}")

        logger.info(f"✅ Total SSH keys: {len(all_ssh_keys)}")
        return {
            "ssh_keys": all_ssh_keys,
            "links": {},
            "meta": {"total": len(all_ssh_keys)}
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch SSH keys: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch SSH keys: {str(e)}")

@router.get("/resources/vpcs")
async def get_vpcs():
    """Get VPC networks for droplet creation"""
    if not do_clients:
        raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("🌐 Fetching VPCs from DigitalOcean...")
        all_vpcs = []
        
        for i, client_info in enumerate(do_clients):
            try:
                response = client_info['client'].vpcs.list()
                
                if isinstance(response, dict) and 'vpcs' in response:
                    vpcs = response['vpcs']
                elif hasattr(response, 'vpcs'):
                    vpcs = response.vpcs
                else:
                    vpcs = []
                
                # Add account info
                for vpc in vpcs:
                    if isinstance(vpc, dict):
                        vpc['account_id'] = i
                    else:
                        setattr(vpc, 'account_id', i)
                
                all_vpcs.extend(vpcs)
                logger.info(f"✅ Account {i+1}: {len(vpcs)} VPCs")
                
            except Exception as e:
                logger.error(f"❌ Error fetching VPCs from account {i+1}: {e}")

        logger.info(f"✅ Total VPCs: {len(all_vpcs)}")
        return {
            "vpcs": all_vpcs,
            "links": {},
            "meta": {"total": len(all_vpcs)}
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch VPCs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch VPCs: {str(e)}")

@router.get("/accounts")
async def get_accounts():
    """Get list of available DigitalOcean accounts/tokens"""
    try:
        logger.info("🏢 Fetching available accounts...")
        
        if not do_clients:
            return {
                "accounts": [],
                "message": "No DigitalOcean tokens configured"
            }
        
        accounts = []
        for i, client_info in enumerate(do_clients):
            accounts.append({
                "id": i,
                "name": f"Account {i+1}" + (" (Primary)" if i == 0 else f" ({'Secondary' if i == 1 else 'Backup'})"),
                "masked_token": client_info['masked_token'],
                "status": "active"
            })
        
        logger.info(f"✅ Retrieved {len(accounts)} accounts")
        return {
            "accounts": accounts,
            "meta": {"total": len(accounts)}
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch accounts: {str(e)}")

@router.post("/{droplet_id}/restart")
async def restart_droplet(droplet_id: str):
    """Restart a droplet"""
    try:
        logger.info(f"🔄 Restarting droplet {droplet_id}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Reboot droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={"type": "reboot"}
                )
                logger.info(f"✅ Restart action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": "Droplet restart initiated",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to restart droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to restart droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to restart droplet: {str(e)}")

@router.post("/{droplet_id}/shutdown")
async def shutdown_droplet(droplet_id: str):
    """Shutdown a droplet (graceful shutdown)"""
    try:
        logger.info(f"⏹️ Shutting down droplet {droplet_id}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Shutdown droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={"type": "shutdown"}
                )
                logger.info(f"✅ Shutdown action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": "Droplet shutdown initiated",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to shutdown droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to shutdown droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to shutdown droplet: {str(e)}")

@router.post("/{droplet_id}/password_reset")
async def password_reset_droplet(droplet_id: str):
    """Reset root password for a droplet"""
    try:
        logger.info(f"🔑 Resetting password for droplet {droplet_id}...")
        
        # Get all DO clients
        clients = get_do_clients()
        if not clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")
        
        # Try each account to find and reset password for the droplet
        for i, client in enumerate(clients):
            try:
                # Reset password
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={"type": "password_reset"}
                )
                logger.info(f"✅ Password reset initiated for droplet {droplet_id} via account {i+1}")
                
                return {
                    "message": "Password reset initiated - New password will be emailed to you",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to reset password for droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to reset password for droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset password: {str(e)}")

@router.post("/{droplet_id}/stop")
async def stop_droplet(droplet_id: str):
    """Stop a droplet (power off)"""
    try:
        logger.info(f"⛔ Stopping droplet {droplet_id}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Power off droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={"type": "power_off"}
                )
                logger.info(f"✅ Stop action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": "Droplet stop initiated",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to stop droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to stop droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop droplet: {str(e)}")

@router.post("/{droplet_id}/start")
async def start_droplet(droplet_id: str):
    """Start a droplet (power on)"""
    try:
        logger.info(f"▶️ Starting droplet {droplet_id}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Power on droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={"type": "power_on"}
                )
                logger.info(f"✅ Start action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": "Droplet start initiated",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to start droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to start droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start droplet: {str(e)}")

@router.post("/{droplet_id}/resize")
async def resize_droplet(droplet_id: str, new_size: str = None):
    """Resize a droplet to a new size"""
    try:
        logger.info(f"📏 Resizing droplet {droplet_id} to size {new_size}...")
        
        if not new_size:
            raise HTTPException(status_code=400, detail="new_size parameter is required")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Resize droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={
                        "type": "resize",
                        "size": new_size,
                        "disk": True  # Permanently resize disk
                    }
                )
                logger.info(f"✅ Resize action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": f"Droplet resize to {new_size} initiated",
                    "action": response,
                    "account_used": i
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to resize droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to resize droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resize droplet: {str(e)}")

@router.post("/{droplet_id}/snapshot")
async def snapshot_droplet(droplet_id: str, snapshot_name: str = None):
    """Create a snapshot of a droplet"""
    try:
        if not snapshot_name:
            from datetime import datetime
            snapshot_name = f"snapshot-{droplet_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        logger.info(f"📸 Creating snapshot '{snapshot_name}' for droplet {droplet_id}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Create snapshot
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={
                        "type": "snapshot",
                        "name": snapshot_name
                    }
                )
                logger.info(f"✅ Snapshot action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": f"Snapshot '{snapshot_name}' creation initiated",
                    "action": response,
                    "account_used": i,
                    "snapshot_name": snapshot_name
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to create snapshot: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")
        
    except Exception as e:
        logger.error(f"❌ Failed to create snapshot for droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create snapshot: {str(e)}")

@router.post("/{droplet_id}/rebuild")
async def rebuild_droplet(droplet_id: str, request_body: dict):
    """Rebuild a droplet with a new image"""
    try:
        image = request_body.get('image')
        if not image:
            raise HTTPException(status_code=400, detail="Missing required field: image")
        
        logger.info(f"🔧 Rebuilding droplet {droplet_id} with image {image}...")
        
        # Try each client until one works
        for i, client_info in enumerate(do_clients):
            try:
                client = client_info['client']
                # Rebuild droplet
                response = client.droplet_actions.post(
                    droplet_id=droplet_id,
                    body={
                        "type": "rebuild",
                        "image": image
                    }
                )
                logger.info(f"✅ Rebuild action initiated for droplet {droplet_id} via account {i+1}")
                return {
                    "message": f"Droplet rebuild with {image} initiated",
                    "action": response,
                    "account_used": i,
                    "image": image
                }
            except Exception as e:
                logger.warning(f"⚠️ Account {i+1} failed to rebuild droplet: {e}")
                continue
        
        raise HTTPException(status_code=404, detail="Droplet not found or access denied")

    except Exception as e:
        logger.error(f"❌ Failed to rebuild droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rebuild droplet: {str(e)}")

@router.post("/{droplet_id}/execute")
async def execute_ssh_command(droplet_id: str, request_body: dict):
    """Execute SSH command on droplet"""
    try:
        command = request_body.get('command')
        droplet_ip = request_body.get('droplet_ip')
        
        if not command:
            raise HTTPException(status_code=400, detail="Missing required field: command")
        
        if not droplet_ip or droplet_ip == 'N/A':
            raise HTTPException(status_code=400, detail="Invalid or missing droplet IP address")
        
        logger.info(f"🖥️ Executing SSH command on droplet {droplet_id} ({droplet_ip}): {command}")
        
        try:
            # Try to establish SSH connection and execute command
            async with asyncssh.connect(
                droplet_ip, 
                username='root',
                known_hosts=None,  # Skip host key verification for demo
                login_timeout=10,
                keepalive_interval=30
            ) as conn:
                
                # Execute command
                result = await conn.run(command, check=False, timeout=30)
                
                output = result.stdout if result.stdout else ''
                error = result.stderr if result.stderr else ''
                
                # Combine output and error
                full_output = output
                if error:
                    full_output += f"\n{error}" if output else error
                
                if not full_output:
                    full_output = f"Command executed successfully (exit code: {result.exit_status})"
                
                logger.info(f"✅ SSH command executed successfully on {droplet_ip}")
                return {
                    "success": True,
                    "output": full_output,
                    "exit_status": result.exit_status,
                    "command": command,
                    "droplet_ip": droplet_ip
                }
                
        except asyncssh.ConnectionError as e:
            logger.warning(f"⚠️ SSH connection failed to {droplet_ip}: {e}")
            return {
                "success": False,
                "error": f"SSH Connection Error: {str(e)}\nMake sure:\n1. Droplet is running and accessible\n2. SSH service is enabled\n3. Your SSH key is configured\n4. Firewall allows SSH (port 22)",
                "command": command,
                "droplet_ip": droplet_ip
            }
        except asyncssh.ProcessError as e:
            logger.warning(f"⚠️ SSH command failed on {droplet_ip}: {e}")
            return {
                "success": False,
                "output": e.stdout if e.stdout else '',
                "error": e.stderr if e.stderr else str(e),
                "exit_status": e.exit_status,
                "command": command,
                "droplet_ip": droplet_ip
            }
        except asyncio.TimeoutError:
            logger.warning(f"⚠️ SSH command timeout on {droplet_ip}")
            return {
                "success": False,
                "error": f"Command timeout (30s) - Command may still be running on server",
                "command": command,
                "droplet_ip": droplet_ip
            }
        except Exception as e:
            logger.error(f"❌ SSH execution error on {droplet_ip}: {e}")
            return {
                "success": False,
                "error": f"SSH Error: {str(e)}",
                "command": command,
                "droplet_ip": droplet_ip
            }
            
    except Exception as e:
        logger.error(f"❌ Failed to execute SSH command on droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {str(e)}")

# Initialize tokens when module loads
load_tokens()

@router.get("/{droplet_id}/volumes")
async def get_droplet_volumes(droplet_id: str):
    """Get volumes attached to a specific droplet"""
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
