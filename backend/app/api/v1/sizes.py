"""
DigitalOcean Sizes API
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
        logger.info(f"✅ Sizes API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Sizes API - Could not load secure tokens: {e}")
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
            logger.info(f"✅ Sizes API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Sizes API - Failed to initialize DO client {i+1}: {e}")

    logger.info(f"✅ Sizes API - Total {len(do_clients)} DigitalOcean clients ready")

# Load tokens on startup
load_tokens_secure()

@router.get("")
async def list_sizes():
    """
    List All Droplet Sizes
    
    To list all of the available Droplet sizes, send a GET request to /v2/sizes.
    The response will be a JSON object with a key called sizes.
    """
    if not do_clients:
        logger.error("❌ No DigitalOcean clients available")
        load_tokens()  # Try to reload
        if not do_clients:
            raise HTTPException(status_code=500, detail="No DigitalOcean clients available")

    try:
        logger.info("📦 Fetching sizes from DigitalOcean API...")
        client = do_clients[0]['client']
        response = client.sizes.list()

        # Parse response according to DO documentation
        sizes = []
        if isinstance(response, dict) and 'sizes' in response:
            for size in response['sizes']:
                sizes.append({
                    'slug': size['slug'],
                    'memory': size['memory'],
                    'vcpus': size['vcpus'],
                    'disk': size['disk'],
                    'transfer': size.get('transfer', 0),
                    'price_monthly': size.get('price_monthly', 0),
                    'price_hourly': size.get('price_hourly', 0),
                    'regions': size.get('regions', []),
                    'available': size.get('available', True),
                    'description': f"{size['vcpus']} vCPU, {size['memory']//1024}GB RAM, {size['disk']}GB SSD"
                })
        else:
            logger.warning(f"Unexpected response format: {type(response)}")
            raise HTTPException(status_code=500, detail="Failed to fetch sizes")

        logger.info(f"✅ Retrieved {len(sizes)} sizes")
        
        # Return format matching DO API
        return {
            "sizes": sizes,
            "links": {},
            "meta": {
                "total": len(sizes)
            }
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch sizes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch sizes: {str(e)}")
