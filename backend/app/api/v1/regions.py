"""
DigitalOcean Regions API
Direct implementation following DO API documentation
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
        logger.info(f"✅ Regions API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Regions API - Could not load secure tokens: {e}")
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
            logger.info(f"✅ Regions API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Regions API - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Regions API - Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup
load_tokens_secure()

@router.get("")
async def list_regions():
    """
    List All Data Center Regions
    
    To list all of the regions that are available, send a GET request to /v2/regions.
    The response will be a JSON object with a key called regions.
    """
    if not do_clients:
        logger.error("❌ No DigitalOcean clients available")
        load_tokens()  # Try to reload
        if not do_clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("🌍 Fetching regions from DigitalOcean API...")
        client = do_clients[0]['client']
        response = client.regions.list()

        # Parse response according to DO documentation
        regions = []
        if isinstance(response, dict) and 'regions' in response:
            for region in response['regions']:
                regions.append({
                    'name': region['name'],
                    'slug': region['slug'],
                    'features': region.get('features', []),
                    'available': region.get('available', True),
                    'sizes': region.get('sizes', [])
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=500, detail="Failed to fetch regions")

        logger.info(f"✅ Retrieved {len(regions)} regions")
        
        # Return format matching DO API
        return {
            "regions": regions,
            "links": {},
            "meta": {
                "total": len(regions)
            }
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch regions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch regions: {str(e)}")
