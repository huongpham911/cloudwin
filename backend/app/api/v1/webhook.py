from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class WebhookPayload(BaseModel):
    """Generic webhook payload"""
    event: str
    data: Dict[str, Any]


@router.post("/droplet/{build_token}")
async def handle_droplet_webhook(
    build_token: str,
    payload: WebhookPayload
):
    """Handle webhooks from DigitalOcean droplet build process"""
    try:
        logger.info(f"Received webhook for build_token: {build_token}")
        logger.info(f"Event: {payload.event}")
        logger.info(f"Data: {payload.data}")
        
        # TODO: Process webhook based on event type
        # For now, just log the webhook
        
        return {"status": "success", "message": "Webhook received"}
        
    except Exception as e:
        logger.error(f"Webhook processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.post("/digitalocean")
async def handle_digitalocean_webhook(
    payload: Dict[str, Any]
):
    """Handle webhooks from DigitalOcean"""
    try:
        logger.info(f"Received DigitalOcean webhook: {payload}")
        
        # TODO: Process DigitalOcean webhooks
        # Events like droplet creation, deletion, etc.
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"DigitalOcean webhook processing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/health")
async def webhook_health():
    """Health check for webhook endpoints"""
    return {"status": "healthy", "service": "webhook"}
