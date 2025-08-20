"""
Public DigitalOcean Resources API (No Authentication Required)
For Create VPS page - regions, sizes, images
"""

from typing import List
from fastapi import APIRouter, HTTPException
import json
import logging
from pydo import Client

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize DO clients
do_clients = []

def load_tokens_secure():
    """Load tokens from enhanced secure token service"""
    user_tokens = []

    try:
        from app.services.enhanced_token_service import enhanced_token_service
        user_tokens = enhanced_token_service.get_all_valid_tokens()
        logger.info(f"✅ Public Resources API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Public Resources API - Could not load secure tokens: {e}")
        return

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
            logger.info(f"✅ Public Resources API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Public Resources API - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Public Resources API - Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup
load_tokens_secure()

@router.get("/public/regions")
async def get_public_regions():
    """Get regions from DigitalOcean API (No Auth Required)"""
    if not do_clients:
        load_tokens()  # Try to reload tokens
        if not do_clients:
            raise HTTPException(status_code=503, detail="No DigitalOcean clients available")

    try:
        logger.info("🌍 Fetching regions for Create VPS...")
        client = do_clients[0]['client']
        response = client.regions.list()

        regions = []
        if isinstance(response, dict) and 'regions' in response:
            for region in response['regions']:
                regions.append({
                    'slug': region['slug'],
                    'name': region['name'],
                    'available': region.get('available', True),
                    'features': region.get('features', [])
                })

        logger.info(f"✅ Retrieved {len(regions)} regions for Create VPS")
        return {
            "regions": regions,
            "total": len(regions)
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch regions: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to fetch regions: {str(e)}")

@router.get("/public/sizes")
async def get_public_sizes():
    """Get sizes from DigitalOcean API (No Auth Required)"""
    if not do_clients:
        load_tokens()
        if not do_clients:
            raise HTTPException(status_code=503, detail="No DigitalOcean clients available")
    
    try:
        logger.info("📦 Fetching sizes for Create VPS...")
        client = do_clients[0]['client']
        response = client.sizes.list()
        
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
        
        logger.info(f"✅ Retrieved {len(sizes)} sizes for Create VPS")
        return {
            "sizes": sizes,
            "total": len(sizes)
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch sizes: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to fetch sizes: {str(e)}")

@router.get("/public/images")
async def get_public_images(type: str = "distribution"):
    """Get images from DigitalOcean API (No Auth Required)"""
    if not do_clients:
        load_tokens()
        if not do_clients:
            raise HTTPException(status_code=503, detail="No DigitalOcean clients available")

    try:
        logger.info(f"💿 Fetching images for Create VPS (type: {type})...")
        client = do_clients[0]['client']
        
        if type == "distribution":
            response = client.images.list(type="distribution")
        elif type == "application":
            response = client.images.list(type="application")
        else:
            response = client.images.list()
        
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

        logger.info(f"✅ Retrieved {len(images)} images for Create VPS (type: {type})")
        return {
            "images": images,
            "total": len(images)
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch images: {e}")
        raise HTTPException(status_code=503, detail=f"Failed to fetch images: {str(e)}")
