"""
Cache Management API Endpoints for WinCloud Builder
Provides cache administration and monitoring capabilities
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.api.deps import get_current_user, require_admin
from app.services.cache_service import cache_service, get_cache
from app.core.cache import check_cache_health, CacheStats, get_cache_connection
from app.models.auth_models import User

router = APIRouter()

# ================================
# PYDANTIC SCHEMAS
# ================================

class CacheKeyRequest(BaseModel):
    """Request model for cache operations"""
    key: str
    value: Optional[Any] = None
    ttl: Optional[int] = 3600

class CachePurgeRequest(BaseModel):
    """Request model for cache purging"""
    patterns: List[str]
    confirm: bool = False

class CacheWarmupRequest(BaseModel):
    """Request model for cache warmup"""
    user_id: Optional[str] = None
    include_system: bool = True

# ================================
# CACHE MONITORING ENDPOINTS
# ================================

@router.get("/health", summary="Cache System Health Check")
async def get_cache_health():
    """
    Get cache system health status
    Returns health information for all Redis databases
    """
    try:
        health_info = await check_cache_health()
        return {
            "success": True,
            "health": health_info
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check cache health: {str(e)}"
        )

@router.get("/stats", summary="Cache Statistics")
async def get_cache_statistics(
    current_user: User = Depends(require_admin)
):
    """
    Get comprehensive cache statistics
    Admin only endpoint for monitoring cache performance
    """
    try:
        cache = await get_cache()
        stats = await cache.get_cache_stats()
        
        # Get additional stats from core cache
        redis_conn = await get_cache_connection()
        cache_stats = CacheStats(redis_conn)
        
        memory_stats = await cache_stats.get_memory_usage()
        keyspace_stats = await cache_stats.get_keyspace_info()
        
        return {
            "success": True,
            "statistics": {
                "service_stats": stats,
                "memory_usage": memory_stats,
                "keyspace_info": keyspace_stats,
                "user_cache_count": await cache_stats.count_keys_by_prefix("user:"),
                "api_cache_count": await cache_stats.count_keys_by_prefix("api:"),
                "system_cache_count": await cache_stats.count_keys_by_prefix("system:")
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache statistics: {str(e)}"
        )

# ================================
# CACHE MANAGEMENT ENDPOINTS
# ================================

@router.get("/user/{user_id}/droplets", summary="Get Cached User Droplets")
async def get_user_cached_droplets(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get cached droplets for a specific user
    Users can only access their own cache, admins can access any user's cache
    """
    # Authorization check
    if current_user.id != user_id and current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        cache = await get_cache()
        cached_droplets = await cache.get_cached_droplets(user_id)
        
        if cached_droplets:
            return {
                "success": True,
                "cached": True,
                "droplets": cached_droplets,
                "count": len(cached_droplets)
            }
        else:
            return {
                "success": True,
                "cached": False,
                "message": "No cached droplets found"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cached droplets: {str(e)}"
        )

@router.delete("/user/{user_id}", summary="Invalidate User Cache")
async def invalidate_user_cache(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Invalidate all cache entries for a specific user
    Users can invalidate their own cache, admins can invalidate any user's cache
    """
    # Authorization check
    if current_user.id != user_id and current_user.role.name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    try:
        cache = await get_cache()
        deleted_count = await cache.invalidate_all_user_cache(user_id)
        
        return {
            "success": True,
            "message": f"Invalidated {deleted_count} cache entries for user {user_id}",
            "deleted_count": deleted_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate user cache: {str(e)}"
        )

@router.post("/warm", summary="Warm Up Cache")
async def warm_cache(
    warmup_request: CacheWarmupRequest,
    current_user: User = Depends(require_admin)
):
    """
    Warm up cache with commonly used data
    Admin only endpoint for performance optimization
    """
    try:
        cache = await get_cache()
        result = await cache.warm_cache(warmup_request.user_id)
        
        return {
            "success": True,
            "warmup_result": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warm cache: {str(e)}"
        )

# ================================
# ADMIN CACHE MANAGEMENT
# ================================

@router.get("/keys", summary="List Cache Keys")
async def list_cache_keys(
    pattern: str = Query("*", description="Key pattern to match"),
    limit: int = Query(100, description="Maximum number of keys to return"),
    current_user: User = Depends(require_admin)
):
    """
    List cache keys matching a pattern
    Admin only endpoint for cache inspection
    """
    try:
        redis_conn = await get_cache_connection()
        keys = await redis_conn.keys(pattern)
        
        # Limit results for performance
        limited_keys = keys[:limit] if len(keys) > limit else keys
        
        return {
            "success": True,
            "keys": limited_keys,
            "total_found": len(keys),
            "returned": len(limited_keys),
            "truncated": len(keys) > limit
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list cache keys: {str(e)}"
        )

@router.get("/key/{key}", summary="Get Cache Value")
async def get_cache_value(
    key: str,
    current_user: User = Depends(require_admin)
):
    """
    Get value for a specific cache key
    Admin only endpoint for cache debugging
    """
    try:
        cache = await get_cache()
        value = await cache.get(key)
        ttl = await cache.get_ttl(key)
        
        if value is not None:
            return {
                "success": True,
                "key": key,
                "value": value,
                "ttl": ttl,
                "exists": True
            }
        else:
            return {
                "success": True,
                "key": key,
                "exists": False,
                "message": "Key not found or expired"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache value: {str(e)}"
        )

@router.post("/key", summary="Set Cache Value")
async def set_cache_value(
    request: CacheKeyRequest,
    current_user: User = Depends(require_admin)
):
    """
    Set a cache key-value pair
    Admin only endpoint for cache management
    """
    try:
        cache = await get_cache()
        success = await cache.set(request.key, request.value, request.ttl)
        
        if success:
            return {
                "success": True,
                "message": f"Cache key '{request.key}' set successfully",
                "ttl": request.ttl
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to set cache value"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set cache value: {str(e)}"
        )

@router.delete("/key/{key}", summary="Delete Cache Key")
async def delete_cache_key(
    key: str,
    current_user: User = Depends(require_admin)
):
    """
    Delete a specific cache key
    Admin only endpoint for cache management
    """
    try:
        cache = await get_cache()
        success = await cache.delete(key)
        
        if success:
            return {
                "success": True,
                "message": f"Cache key '{key}' deleted successfully"
            }
        else:
            return {
                "success": False,
                "message": f"Cache key '{key}' not found"
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete cache key: {str(e)}"
        )

@router.post("/purge", summary="Purge Cache by Pattern")
async def purge_cache_patterns(
    purge_request: CachePurgeRequest,
    current_user: User = Depends(require_admin)
):
    """
    Purge cache keys matching specific patterns
    Admin only endpoint - requires confirmation for safety
    """
    if not purge_request.confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cache purge requires confirmation"
        )
    
    try:
        cache = await get_cache()
        total_deleted = 0
        
        for pattern in purge_request.patterns:
            deleted = await cache.delete_pattern(pattern)
            total_deleted += deleted
        
        return {
            "success": True,
            "message": f"Purged {total_deleted} cache keys",
            "patterns": purge_request.patterns,
            "deleted_count": total_deleted
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to purge cache: {str(e)}"
        )

@router.post("/flush", summary="Flush All Cache")
async def flush_all_cache(
    confirm: bool = Query(False, description="Confirmation required"),
    current_user: User = Depends(require_admin)
):
    """
    Flush all cache data
    DANGER: Admin only endpoint - requires explicit confirmation
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cache flush requires explicit confirmation"
        )
    
    try:
        redis_conn = await get_cache_connection()
        await redis_conn.flushdb()
        
        return {
            "success": True,
            "message": "All cache data flushed successfully",
            "warning": "This action cleared all cached data"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to flush cache: {str(e)}"
        )
