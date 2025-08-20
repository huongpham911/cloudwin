"""
CDN Endpoints API
Provides REST API for managing DigitalOcean CDN endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.core.security import get_current_user, require_role
from app.services.cdn import get_cdn_service
from app.core.utils import get_do_token

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# Pydantic models for request/response
class CDNEndpointCreate(BaseModel):
    origin: str
    ttl: Optional[int] = None
    custom_domain: Optional[str] = None
    certificate_id: Optional[str] = None

class CDNEndpointUpdate(BaseModel):
    ttl: Optional[int] = None
    custom_domain: Optional[str] = None
    certificate_id: Optional[str] = None

class CachePurgeRequest(BaseModel):
    files: List[str]

class SpaceCDNRequest(BaseModel):
    space_name: str
    region: str = "nyc3"
    ttl: Optional[int] = 3600

@router.get("/endpoints")
async def list_cdn_endpoints(
    current_user: dict = Depends(get_current_user),
    per_page: int = 25,
    page: int = 1
):
    """
    List all CDN endpoints
    Requires: User authentication
    """
    try:
        logger.info(f"🌐 User {current_user.get('email')} listing CDN endpoints")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and list endpoints
        cdn_service = get_cdn_service(token)
        result = await cdn_service.list_endpoints(per_page=per_page, page=page)
        
        logger.info(f"✅ Retrieved {len(result.get('endpoints', []))} CDN endpoints")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error listing CDN endpoints: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list CDN endpoints: {str(e)}"
        )

@router.get("/endpoints/{cdn_id}")
async def get_cdn_endpoint(
    cdn_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get details of a specific CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🔍 User {current_user.get('email')} getting CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and retrieve endpoint
        cdn_service = get_cdn_service(token)
        result = await cdn_service.get_endpoint(cdn_id)
        
        logger.info(f"✅ Retrieved CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get CDN endpoint: {str(e)}"
        )

@router.post("/endpoints")
async def create_cdn_endpoint(
    endpoint_data: CDNEndpointCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🆕 User {current_user.get('email')} creating CDN endpoint for: {endpoint_data.origin}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and create endpoint
        cdn_service = get_cdn_service(token)
        result = await cdn_service.create_endpoint(
            origin=endpoint_data.origin,
            ttl=endpoint_data.ttl,
            custom_domain=endpoint_data.custom_domain,
            certificate_id=endpoint_data.certificate_id
        )
        
        logger.info(f"✅ Created CDN endpoint for: {endpoint_data.origin}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error creating CDN endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create CDN endpoint: {str(e)}"
        )

@router.put("/endpoints/{cdn_id}")
async def update_cdn_endpoint(
    cdn_id: str,
    endpoint_data: CDNEndpointUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"📝 User {current_user.get('email')} updating CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and update endpoint
        cdn_service = get_cdn_service(token)
        result = await cdn_service.update_endpoint(
            cdn_id=cdn_id,
            ttl=endpoint_data.ttl,
            custom_domain=endpoint_data.custom_domain,
            certificate_id=endpoint_data.certificate_id
        )
        
        logger.info(f"✅ Updated CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error updating CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update CDN endpoint: {str(e)}"
        )

@router.delete("/endpoints/{cdn_id}")
async def delete_cdn_endpoint(
    cdn_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🗑️ User {current_user.get('email')} deleting CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and delete endpoint
        cdn_service = get_cdn_service(token)
        result = await cdn_service.delete_endpoint(cdn_id)
        
        logger.info(f"✅ Deleted CDN endpoint: {cdn_id}")
        return {"message": f"CDN endpoint {cdn_id} deleted successfully", "success": result}
        
    except Exception as e:
        logger.error(f"❌ Error deleting CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete CDN endpoint: {str(e)}"
        )

@router.delete("/endpoints/{cdn_id}/cache")
async def purge_cdn_cache(
    cdn_id: str,
    purge_data: CachePurgeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Purge cached content from a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🧹 User {current_user.get('email')} purging cache for CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and purge cache
        cdn_service = get_cdn_service(token)
        result = await cdn_service.purge_cache(cdn_id, purge_data.files)
        
        logger.info(f"✅ Purged cache for CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error purging cache for CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to purge cache: {str(e)}"
        )

@router.delete("/endpoints/{cdn_id}/cache/all")
async def purge_all_cdn_cache(
    cdn_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Purge all cached content from a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🧹 User {current_user.get('email')} purging ALL cache for CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and purge all cache
        cdn_service = get_cdn_service(token)
        result = await cdn_service.purge_all_cache(cdn_id)
        
        logger.info(f"✅ Purged ALL cache for CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error purging all cache for CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to purge all cache: {str(e)}"
        )

@router.post("/endpoints/spaces")
async def create_cdn_for_space(
    space_data: SpaceCDNRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a CDN endpoint for a DigitalOcean Space
    Requires: User authentication
    """
    try:
        logger.info(f"🚀 User {current_user.get('email')} creating CDN for Space: {space_data.space_name}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and create endpoint for Space
        cdn_service = get_cdn_service(token)
        result = await cdn_service.create_endpoint_for_space(
            space_name=space_data.space_name,
            region=space_data.region,
            ttl=space_data.ttl
        )
        
        logger.info(f"✅ Created CDN for Space: {space_data.space_name}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error creating CDN for Space {space_data.space_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create CDN for Space: {str(e)}"
        )

@router.get("/endpoints/{cdn_id}/validate")
async def validate_cdn_endpoint(
    cdn_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Validate a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"🔍 User {current_user.get('email')} validating CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and validate endpoint
        cdn_service = get_cdn_service(token)
        result = await cdn_service.validate_endpoint(cdn_id)
        
        logger.info(f"✅ Validated CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error validating CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate CDN endpoint: {str(e)}"
        )

@router.get("/endpoints/{cdn_id}/metrics")
async def get_cdn_endpoint_metrics(
    cdn_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get performance metrics for a CDN endpoint
    Requires: User authentication
    """
    try:
        logger.info(f"📊 User {current_user.get('email')} getting metrics for CDN endpoint: {cdn_id}")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and retrieve metrics
        cdn_service = get_cdn_service(token)
        result = await cdn_service.get_endpoint_metrics(cdn_id)
        
        logger.info(f"✅ Retrieved metrics for CDN endpoint: {cdn_id}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting metrics for CDN endpoint {cdn_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get CDN endpoint metrics: {str(e)}"
        )

@router.get("/statistics")
async def get_cdn_statistics(
    current_user: dict = Depends(get_current_user)
):
    """
    Get overall CDN statistics and usage summary
    Requires: User authentication
    """
    try:
        logger.info(f"📊 User {current_user.get('email')} getting CDN statistics")
        
        # Get DigitalOcean token
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and retrieve statistics
        cdn_service = get_cdn_service(token)
        result = await cdn_service.get_cdn_statistics()
        
        logger.info(f"✅ Retrieved CDN statistics")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error getting CDN statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get CDN statistics: {str(e)}"
        )

# Admin only endpoints
@router.get("/admin/endpoints", dependencies=[Depends(require_role("admin"))])
async def admin_list_all_cdn_endpoints(
    current_user: dict = Depends(get_current_user)
):
    """
    Admin: List all CDN endpoints across all accounts
    Requires: Admin role
    """
    try:
        logger.info(f"👑 Admin {current_user.get('email')} listing all CDN endpoints")
        
        # For admin, we'll use the main DigitalOcean token
        # This would require access to all user tokens or a master token
        # For now, use the current user's token as fallback
        token = await get_do_token(current_user['id'])
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get CDN service and list all endpoints
        cdn_service = get_cdn_service(token)
        result = await cdn_service.list_endpoints()
        
        # Add admin metadata
        result["admin_view"] = True
        result["viewed_by"] = current_user.get('email')
        
        logger.info(f"👑 Admin retrieved {len(result.get('endpoints', []))} CDN endpoints")
        return result
        
    except Exception as e:
        logger.error(f"❌ Admin error listing CDN endpoints: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list CDN endpoints: {str(e)}"
        )
