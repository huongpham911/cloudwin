"""
DigitalOcean Images API
Direct implementation following DO API documentation
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
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
        logger.info(f"✅ Images API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Images API - Could not load secure tokens: {e}")
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
            logger.info(f"✅ Images API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Images API - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Images API - Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup
load_tokens_secure()

@router.get("")
async def list_images(
    type: Optional[str] = Query(None, description="Filter by image type: distribution, application"),
    per_page: int = Query(25, ge=1, le=200, description="Number of items per page"),
    page: int = Query(1, ge=1, description="Page number")
):
    """
    List All Images
    
    To list all of the images available on your account, send a GET request to /v2/images.
    The response will be a JSON object with a key called images.
    """
    if not do_clients:
        logger.error("❌ No DigitalOcean clients available")
        load_tokens()  # Try to reload
        if not do_clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info(f"💿 Fetching images from DigitalOcean API (type: {type})...")
        client = do_clients[0]['client']
        
        # Fetch images based on type filter
        if type == "distribution":
            response = client.images.list(type="distribution", per_page=per_page, page=page)
        elif type == "application":
            response = client.images.list(type="application", per_page=per_page, page=page)
        else:
            # Get all public images (distributions + applications)
            response = client.images.list(per_page=per_page, page=page)

        # Parse response according to DO documentation
        images = []
        if isinstance(response, dict) and 'images' in response:
            for image in response['images']:
                images.append({
                    'id': image['id'],
                    'name': image['name'],
                    'type': image.get('type', ''),
                    'distribution': image.get('distribution', ''),
                    'slug': image.get('slug'),
                    'public': image.get('public', True),
                    'regions': image.get('regions', []),
                    'min_disk_size': image.get('min_disk_size', 0),
                    'size_gigabytes': image.get('size_gigabytes', 0),
                    'description': image.get('description', ''),
                    'status': image.get('status', 'available'),
                    'error_message': image.get('error_message'),
                    'created_at': image.get('created_at'),
                    'tags': image.get('tags', [])
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=500, detail="Failed to fetch images")

        logger.info(f"✅ Retrieved {len(images)} images")
        
        # Extract pagination info if available
        links = response.get('links', {}) if isinstance(response, dict) else {}
        meta = response.get('meta', {}) if isinstance(response, dict) else {}
        
        # Return format matching DO API
        return {
            "images": images,
            "links": links,
            "meta": {
                "total": meta.get('total', len(images))
            }
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch images: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch images: {str(e)}")
