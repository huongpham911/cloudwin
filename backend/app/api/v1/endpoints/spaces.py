"""
DigitalOcean Spaces API endpoints
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
import logging

from app.api.deps import get_current_user
from app.services.digitalocean_service import DigitalOceanService
from app.services.secure_token_service import secure_token_service
from ..schemas.spaces import (
    SpacesKeyCreate,
    SpacesKeyUpdate, 
    SpacesKeyPatch,
    SpacesKeyResponse,
    SpacesKeyListResponse,
    SpacesKeyUsageResponse,
    SpacesKeyValidationResponse,
    SpacesKeyDeleteResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()

async def get_user_do_token(current_user: dict) -> str:
    """Get DigitalOcean token for current user"""
    try:
        # Get tokens from secure token service
        tokens_data = secure_token_service.get_user_tokens(current_user['id'])
        if tokens_data and not tokens_data.get('error'):
            tokens = tokens_data.get('tokens', [])
            # Find first valid token
            for token in tokens:
                if token.get('status') == 'valid' and token.get('token'):
                    return token['token']
        
        # Fallback: try to get from headers if passed
        return None
    except Exception as e:
        logger.error(f"Error getting user DO token: {e}")
        return None

@router.get("/", response_model=dict)
async def list_spaces_keys(
    per_page: int = Query(25, ge=1, le=200, description="Number of items per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: dict = Depends(get_current_user)
):
    """
    📋 List user's Spaces access keys
    
    - **per_page**: Number of items per page (1-200)
    - **page**: Page number (starting from 1)
    """
    try:
        # Get user's DigitalOcean token
        do_token = await get_user_do_token(current_user)
        if not do_token:
            raise HTTPException(
                status_code=400, 
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Create DigitalOcean service with user's token
        do_service = DigitalOceanService(api_token=do_token)
        
        # Get spaces keys using DO API
        try:
            response = do_service.client.spaces_keys.list()
            spaces_keys = response.get('spaces_keys', []) if isinstance(response, dict) else response.spaces_keys
            
            # Convert to list of dicts
            keys_list = []
            for key in spaces_keys:
                if isinstance(key, dict):
                    key_dict = key
                else:
                    key_dict = {
                        'id': key.id if hasattr(key, 'id') else None,
                        'name': key.name if hasattr(key, 'name') else None,
                        'access_key': key.access_key if hasattr(key, 'access_key') else None,
                        'secret_key': key.secret_key if hasattr(key, 'secret_key') else None,
                        'region': getattr(key, 'region', 'nyc3'),
                        'endpoint': f"{getattr(key, 'region', 'nyc3')}.digitaloceanspaces.com",
                        'status': 'active',
                        'created_at': getattr(key, 'created_at', None)
                    }
                keys_list.append(key_dict)
            
            return {
                "spaces_keys": keys_list,
                "total": len(keys_list),
                "page": page,
                "per_page": per_page
            }
            
        except Exception as e:
            logger.error(f"❌ Error calling DO Spaces API: {str(e)}")
            # Return empty result if API call fails
            return {
                "spaces_keys": [],
                "total": 0,
                "page": page,
                "per_page": per_page,
                "error": str(e)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error listing Spaces keys: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key_id}", response_model=dict)
async def get_spaces_key(key_id: str):
    """
    🔍 Get details of a specific Spaces access key
    
    - **key_id**: Unique identifier of the Spaces access key
    """
    try:
        result = await spaces_service.get_spaces_key(key_id)
        return result
    except Exception as e:
        logger.error(f"❌ Error getting Spaces key {key_id}: {str(e)}")
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Spaces key {key_id} not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=dict)
async def create_spaces_key(spaces_key_data: SpacesKeyCreate):
    """
    🆕 Create a new Spaces access key
    
    - **name**: Name for the Spaces access key
    - **buckets**: Optional list of bucket names to restrict access to
    """
    try:
        result = await spaces_service.create_spaces_key(
            name=spaces_key_data.name,
            buckets=spaces_key_data.buckets
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error creating Spaces key: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{key_id}", response_model=dict)
async def update_spaces_key(key_id: str, spaces_key_data: SpacesKeyUpdate):
    """
    📝 Update a Spaces access key (full update)
    
    - **key_id**: Unique identifier of the Spaces access key
    - **name**: New name for the key (optional)
    - **buckets**: New list of bucket restrictions (optional)
    """
    try:
        result = await spaces_service.update_spaces_key(
            key_id=key_id,
            name=spaces_key_data.name,
            buckets=spaces_key_data.buckets
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error updating Spaces key {key_id}: {str(e)}")
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Spaces key {key_id} not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{key_id}", response_model=dict)
async def patch_spaces_key(key_id: str, spaces_key_data: SpacesKeyPatch):
    """
    🔧 Partially update a Spaces access key
    
    - **key_id**: Unique identifier of the Spaces access key
    - **name**: New name for the key (optional)
    - **buckets**: New list of bucket restrictions (optional)
    """
    try:
        result = await spaces_service.patch_spaces_key(
            key_id=key_id,
            name=spaces_key_data.name,
            buckets=spaces_key_data.buckets
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error patching Spaces key {key_id}: {str(e)}")
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Spaces key {key_id} not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{key_id}", response_model=SpacesKeyDeleteResponse)
async def delete_spaces_key(key_id: str):
    """
    🗑️ Delete a Spaces access key
    
    - **key_id**: Unique identifier of the Spaces access key to delete
    """
    try:
        success = await spaces_service.delete_spaces_key(key_id)
        return SpacesKeyDeleteResponse(
            success=success,
            key_id=key_id,
            message=f"Spaces key {key_id} deleted successfully"
        )
    except Exception as e:
        logger.error(f"❌ Error deleting Spaces key {key_id}: {str(e)}")
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Spaces key {key_id} not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key_id}/usage", response_model=SpacesKeyUsageResponse)
async def get_spaces_key_usage(key_id: str):
    """
    📊 Get usage statistics for a Spaces access key
    
    - **key_id**: Unique identifier of the Spaces access key
    """
    try:
        result = await spaces_service.get_spaces_key_usage(key_id)
        return result
    except Exception as e:
        logger.error(f"❌ Error getting usage for Spaces key {key_id}: {str(e)}")
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=f"Spaces key {key_id} not found")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{key_id}/validate", response_model=SpacesKeyValidationResponse)
async def validate_spaces_key(key_id: str):
    """
    🔍 Validate a Spaces access key
    
    - **key_id**: Unique identifier of the Spaces access key to validate
    """
    try:
        result = await spaces_service.validate_spaces_key(key_id)
        return result
    except Exception as e:
        logger.error(f"❌ Error validating Spaces key {key_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Additional utility endpoints

@router.post("/bulk-delete")
async def bulk_delete_spaces_keys(key_ids: List[str]):
    """
    🗑️ Delete multiple Spaces access keys
    
    - **key_ids**: List of Spaces access key IDs to delete
    """
    try:
        results = []
        for key_id in key_ids:
            try:
                success = await spaces_service.delete_spaces_key(key_id)
                results.append({
                    "key_id": key_id,
                    "success": success,
                    "message": "Deleted successfully"
                })
            except Exception as e:
                results.append({
                    "key_id": key_id,
                    "success": False,
                    "message": str(e)
                })
        
        return {
            "results": results,
            "total_processed": len(key_ids),
            "successful": len([r for r in results if r["success"]]),
            "failed": len([r for r in results if not r["success"]])
        }
    except Exception as e:
        logger.error(f"❌ Error in bulk delete: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=dict)
async def get_spaces_summary():
    """
    📊 Get summary of all Spaces access keys
    """
    try:
        # Get all keys
        all_keys = await spaces_service.list_spaces_keys(per_page=200)
        spaces_keys = all_keys.get('spaces_keys', [])
        
        # Calculate summary statistics
        total_keys = len(spaces_keys)
        keys_with_restrictions = len([key for key in spaces_keys if key.get('buckets')])
        unrestricted_keys = total_keys - keys_with_restrictions
        
        # Group by bucket restrictions
        bucket_usage = {}
        for key in spaces_keys:
            buckets = key.get('buckets', [])
            if buckets:
                for bucket in buckets:
                    bucket_usage[bucket] = bucket_usage.get(bucket, 0) + 1
        
        summary = {
            "total_keys": total_keys,
            "keys_with_restrictions": keys_with_restrictions,
            "unrestricted_keys": unrestricted_keys,
            "bucket_usage": bucket_usage,
            "most_used_buckets": sorted(bucket_usage.items(), key=lambda x: x[1], reverse=True)[:5]
        }
        
        return summary
    except Exception as e:
        logger.error(f"❌ Error getting Spaces summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# Spaces Buckets Management
# ================================

@router.get("/buckets/", response_model=dict)
async def list_spaces_buckets(
    region: str = Query("nyc3", description="Region to list buckets from"),
    current_user: dict = Depends(get_current_user)
):
    """
    📦 List user's Spaces buckets
    """
    try:
        # Get user's DigitalOcean token
        do_token = await get_user_do_token(current_user)
        if not do_token:
            raise HTTPException(
                status_code=400, 
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # For buckets, we need to use boto3 with Spaces credentials
        # First, get Spaces keys to get access credentials
        do_service = DigitalOceanService(api_token=do_token)
        
        try:
            response = do_service.client.spaces_keys.list()
            spaces_keys = response.get('spaces_keys', []) if isinstance(response, dict) else response.spaces_keys
            
            if not spaces_keys:
                return {
                    "buckets": [],
                    "total": 0,
                    "region": region,
                    "message": "No Spaces keys found. Create a Spaces key first."
                }
            
            # Use first available spaces key for S3 operations
            first_key = spaces_keys[0]
            access_key = first_key.access_key if hasattr(first_key, 'access_key') else first_key.get('access_key')
            secret_key = first_key.secret_key if hasattr(first_key, 'secret_key') else first_key.get('secret_key')
            
            if not access_key or not secret_key:
                return {
                    "buckets": [],
                    "total": 0,
                    "region": region,
                    "message": "Spaces key found but missing access credentials"
                }
            
            # Use boto3 to list buckets
            import boto3
            from botocore.config import Config
            
            session = boto3.session.Session()
            s3_client = session.client(
                's3',
                region_name=region,
                endpoint_url=f'https://{region}.digitaloceanspaces.com',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version='s3v4')
            )
            
            # List buckets
            response = s3_client.list_buckets()
            buckets_list = []
            
            for bucket in response.get('Buckets', []):
                bucket_dict = {
                    'name': bucket['Name'],
                    'creation_date': bucket['CreationDate'].isoformat() if bucket.get('CreationDate') else None,
                    'region': region,
                    'endpoint': f'{region}.digitaloceanspaces.com'
                }
                buckets_list.append(bucket_dict)
            
            return {
                "buckets": buckets_list,
                "total": len(buckets_list),
                "region": region
            }
            
        except Exception as e:
            logger.error(f"❌ Error listing buckets: {str(e)}")
            return {
                "buckets": [],
                "total": 0,
                "region": region,
                "error": str(e)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error listing Spaces buckets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/buckets/{bucket_name}/files", response_model=dict)
async def list_bucket_files(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket"),
    prefix: str = Query("", description="Prefix to filter files"),
    current_user: dict = Depends(get_current_user)
):
    """
    📁 List files in a Spaces bucket
    """
    try:
        # Get user's DigitalOcean token
        do_token = await get_user_do_token(current_user)
        if not do_token:
            raise HTTPException(
                status_code=400, 
                detail="DigitalOcean token not found. Please configure your API token first."
            )
        
        # Get Spaces credentials
        do_service = DigitalOceanService(api_token=do_token)
        
        try:
            response = do_service.client.spaces_keys.list()
            spaces_keys = response.get('spaces_keys', []) if isinstance(response, dict) else response.spaces_keys
            
            if not spaces_keys:
                return {
                    "files": [],
                    "bucket_name": bucket_name,
                    "total": 0,
                    "message": "No Spaces keys found. Create a Spaces key first."
                }
            
            # Use first available spaces key for S3 operations
            first_key = spaces_keys[0]
            access_key = first_key.access_key if hasattr(first_key, 'access_key') else first_key.get('access_key')
            secret_key = first_key.secret_key if hasattr(first_key, 'secret_key') else first_key.get('secret_key')
            
            if not access_key or not secret_key:
                return {
                    "files": [],
                    "bucket_name": bucket_name,
                    "total": 0,
                    "message": "Spaces key found but missing access credentials"
                }
            
            # Use boto3 to list objects
            import boto3
            from botocore.config import Config
            
            session = boto3.session.Session()
            s3_client = session.client(
                's3',
                region_name=region,
                endpoint_url=f'https://{region}.digitaloceanspaces.com',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version='s3v4')
            )
            
            # List objects in bucket
            list_params = {'Bucket': bucket_name}
            if prefix:
                list_params['Prefix'] = prefix
                
            response = s3_client.list_objects_v2(**list_params)
            files_list = []
            
            for obj in response.get('Contents', []):
                file_dict = {
                    'id': obj['Key'],
                    'key': obj['Key'],
                    'name': obj['Key'].split('/')[-1],  # Get filename from key
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat() if obj.get('LastModified') else None,
                    'type': 'file',
                    'bucket_name': bucket_name,
                    'region': region
                }
                files_list.append(file_dict)
            
            return {
                "files": files_list,
                "bucket_name": bucket_name,
                "total": len(files_list),
                "region": region
            }
            
        except Exception as e:
            logger.error(f"❌ Error listing files in bucket {bucket_name}: {str(e)}")
            return {
                "files": [],
                "bucket_name": bucket_name,
                "total": 0,
                "region": region,
                "error": str(e)
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error listing files in bucket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/buckets", response_model=dict)
async def create_spaces_bucket(
    name: str = Query(..., description="Bucket name"),
    region: str = Query("nyc3", description="Region for the bucket")
):
    """
    🏗️ Create a new Spaces bucket
    
    - **name**: Name of the bucket (must be unique)
    - **region**: Region where the bucket will be created (default: nyc3)
    """
    try:
        result = await spaces_service.create_bucket(name=name, region=region)
        return result
    except Exception as e:
        logger.error(f"❌ Error creating Spaces bucket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/buckets/{bucket_name}", response_model=dict)
async def delete_spaces_bucket(bucket_name: str):
    """
    🗑️ Delete a Spaces bucket
    
    - **bucket_name**: Name of the bucket to delete
    """
    try:
        result = await spaces_service.delete_bucket(name=bucket_name)
        return result
    except Exception as e:
        logger.error(f"❌ Error deleting Spaces bucket: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# CDN Settings for Spaces Buckets
# ================================

@router.get("/buckets/{bucket_name}/cdn", response_model=dict)
async def get_bucket_cdn_status(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket")
):
    """
    🔍 Get CDN status for a Spaces bucket
    
    - **bucket_name**: Name of the Spaces bucket
    - **region**: Region of the bucket (default: nyc3)
    """
    try:
        result = await spaces_service.get_bucket_cdn_status(bucket_name=bucket_name, region=region)
        return result
    except Exception as e:
        logger.error(f"❌ Error getting CDN status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/buckets/{bucket_name}/cdn/enable", response_model=dict)
async def enable_bucket_cdn(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket"),
    ttl: int = Query(3600, description="Cache TTL in seconds"),
    custom_domain: Optional[str] = Query(None, description="Custom domain for the CDN"),
    certificate_id: Optional[str] = Query(None, description="Certificate ID for custom domain")
):
    """
    🚀 Enable CDN for a Spaces bucket
    
    - **bucket_name**: Name of the Spaces bucket
    - **region**: Region of the bucket (default: nyc3)
    - **ttl**: Cache TTL in seconds (default: 3600 = 1 hour)
    - **custom_domain**: Optional custom domain for the CDN
    - **certificate_id**: Optional certificate ID for custom domain
    """
    try:
        result = await spaces_service.enable_bucket_cdn(
            bucket_name=bucket_name,
            region=region,
            ttl=ttl,
            custom_domain=custom_domain,
            certificate_id=certificate_id
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error enabling CDN: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/buckets/{bucket_name}/cdn/disable", response_model=dict)
async def disable_bucket_cdn(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket")
):
    """
    🛑 Disable CDN for a Spaces bucket
    
    - **bucket_name**: Name of the Spaces bucket
    - **region**: Region of the bucket (default: nyc3)
    """
    try:
        result = await spaces_service.disable_bucket_cdn(bucket_name=bucket_name, region=region)
        return result
    except Exception as e:
        logger.error(f"❌ Error disabling CDN: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/buckets/{bucket_name}/cdn/settings", response_model=dict)
async def update_bucket_cdn_settings(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket"),
    ttl: Optional[int] = Query(None, description="New cache TTL in seconds"),
    custom_domain: Optional[str] = Query(None, description="New custom domain for the CDN"),
    certificate_id: Optional[str] = Query(None, description="Certificate ID for custom domain")
):
    """
    ⚙️ Update CDN settings for a Spaces bucket
    
    - **bucket_name**: Name of the Spaces bucket
    - **region**: Region of the bucket (default: nyc3)
    - **ttl**: New cache TTL in seconds
    - **custom_domain**: New custom domain for the CDN
    - **certificate_id**: Certificate ID for custom domain
    """
    try:
        result = await spaces_service.update_bucket_cdn_settings(
            bucket_name=bucket_name,
            region=region,
            ttl=ttl,
            custom_domain=custom_domain,
            certificate_id=certificate_id
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error updating CDN settings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/buckets/{bucket_name}/cdn/purge", response_model=dict)
async def purge_bucket_cdn_cache(
    bucket_name: str,
    region: str = Query("nyc3", description="Region of the bucket"),
    files: Optional[List[str]] = Query(None, description="List of file paths to purge (default: purge all)")
):
    """
    🧹 Purge CDN cache for a Spaces bucket
    
    - **bucket_name**: Name of the Spaces bucket
    - **region**: Region of the bucket (default: nyc3)
    - **files**: List of file paths to purge (default: purge all with "*")
    """
    try:
        result = await spaces_service.purge_bucket_cdn_cache(
            bucket_name=bucket_name,
            region=region,
            files=files
        )
        return result
    except Exception as e:
        logger.error(f"❌ Error purging CDN cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
