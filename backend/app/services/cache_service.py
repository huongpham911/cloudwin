"""
Redis Cache Service for WinCloud Builder
Provides comprehensive caching functionality for API responses, database queries, and user data
"""

import json
import asyncio
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable
from functools import wraps
import logging

import redis.asyncio as redis
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """
    Comprehensive Redis cache service for WinCloud Builder
    Handles API caching, database query caching, and user-specific data caching
    """
    
    def __init__(self):
        self.redis_client = None
        self.default_ttl = getattr(settings, 'CACHE_TTL', 3600)  # 1 hour default
        self.key_prefix = "wincloud_cache:"
        
    async def initialize(self):
        """Initialize Redis connection"""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/3')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            await self.redis_client.ping()
            logger.info("🔴 Cache service initialized with Redis")
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache service: {e}")
            self.redis_client = None
    
    def _generate_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = f"{args}_{kwargs}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{self.key_prefix}{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
            
        try:
            full_key = f"{self.key_prefix}{key}"
            value = await self.redis_client.get(full_key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"❌ Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if not self.redis_client:
            return False
            
        try:
            full_key = f"{self.key_prefix}{key}"
            serialized_value = json.dumps(value, default=str)
            ttl = ttl or self.default_ttl
            
            await self.redis_client.setex(full_key, ttl, serialized_value)
            logger.debug(f"✅ Cached {key} for {ttl} seconds")
            return True
        except Exception as e:
            logger.error(f"❌ Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis_client:
            return False
            
        try:
            full_key = f"{self.key_prefix}{key}"
            result = await self.redis_client.delete(full_key)
            logger.debug(f"🗑️ Deleted cache key: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"❌ Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_client:
            return 0
            
        try:
            full_pattern = f"{self.key_prefix}{pattern}"
            keys = await self.redis_client.keys(full_pattern)
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.info(f"🗑️ Deleted {deleted} cache keys matching pattern: {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"❌ Cache pattern delete error for {pattern}: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.redis_client:
            return False
            
        try:
            full_key = f"{self.key_prefix}{key}"
            return bool(await self.redis_client.exists(full_key))
        except Exception as e:
            logger.error(f"❌ Cache exists error for key {key}: {e}")
            return False
    
    async def get_ttl(self, key: str) -> int:
        """Get TTL for a key"""
        if not self.redis_client:
            return -1
            
        try:
            full_key = f"{self.key_prefix}{key}"
            return await self.redis_client.ttl(full_key)
        except Exception as e:
            logger.error(f"❌ Cache TTL error for key {key}: {e}")
            return -1
    
    # ================================
    # SPECIALIZED CACHE FUNCTIONS
    # ================================
    
    async def cache_droplet_list(self, user_id: str, droplets: List[Dict], ttl: int = 60) -> bool:
        """Cache user's droplet list"""
        key = f"droplets:user:{user_id}"
        cache_data = {
            "droplets": droplets,
            "cached_at": datetime.utcnow().isoformat(),
            "count": len(droplets)
        }
        return await self.set(key, cache_data, ttl)
    
    async def get_cached_droplets(self, user_id: str) -> Optional[List[Dict]]:
        """Get cached droplet list for user"""
        key = f"droplets:user:{user_id}"
        cached_data = await self.get(key)
        if cached_data:
            logger.info(f"📦 Retrieved {cached_data['count']} cached droplets for user {user_id}")
            return cached_data['droplets']
        return None
    
    async def invalidate_user_droplets(self, user_id: str) -> bool:
        """Invalidate user's droplet cache"""
        return await self.delete(f"droplets:user:{user_id}")
    
    async def cache_do_api_response(self, endpoint: str, params: Dict, response: Any, ttl: int = 300) -> bool:
        """Cache DigitalOcean API response"""
        key = f"do_api:{endpoint}:{hashlib.md5(str(params).encode()).hexdigest()}"
        cache_data = {
            "response": response,
            "cached_at": datetime.utcnow().isoformat(),
            "endpoint": endpoint,
            "params": params
        }
        return await self.set(key, cache_data, ttl)
    
    async def get_cached_do_response(self, endpoint: str, params: Dict) -> Optional[Any]:
        """Get cached DigitalOcean API response"""
        key = f"do_api:{endpoint}:{hashlib.md5(str(params).encode()).hexdigest()}"
        cached_data = await self.get(key)
        if cached_data:
            logger.info(f"📡 Retrieved cached DO API response for {endpoint}")
            return cached_data['response']
        return None
    
    async def cache_user_preferences(self, user_id: str, preferences: Dict, ttl: int = 86400) -> bool:
        """Cache user preferences (24 hour TTL)"""
        key = f"preferences:user:{user_id}"
        return await self.set(key, preferences, ttl)
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict]:
        """Get cached user preferences"""
        key = f"preferences:user:{user_id}"
        return await self.get(key)
    
    async def cache_system_metrics(self, metrics: Dict, ttl: int = 60) -> bool:
        """Cache system metrics"""
        key = "system:metrics"
        cache_data = {
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        return await self.set(key, cache_data, ttl)
    
    async def get_system_metrics(self) -> Optional[Dict]:
        """Get cached system metrics"""
        key = "system:metrics"
        cached_data = await self.get(key)
        if cached_data:
            return cached_data['metrics']
        return None
    
    # ================================
    # CACHE DECORATORS
    # ================================
    
    def cache_result(self, ttl: int = 300, key_prefix: str = "func"):
        """Decorator to cache function results"""
        def decorator(func: Callable):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = f"{key_prefix}:{func.__name__}:{self._generate_key(*args, **kwargs)}"
                
                # Try to get from cache
                cached_result = await self.get(cache_key)
                if cached_result is not None:
                    logger.debug(f"💾 Cache hit for {func.__name__}")
                    return cached_result
                
                # Execute function and cache result
                logger.debug(f"🔄 Cache miss for {func.__name__}, executing...")
                result = await func(*args, **kwargs)
                
                # Cache the result
                await self.set(cache_key, result, ttl)
                return result
            
            return wrapper
        return decorator
    
    async def invalidate_all_user_cache(self, user_id: str) -> int:
        """Invalidate all cache entries for a specific user"""
        patterns = [
            f"droplets:user:{user_id}",
            f"preferences:user:{user_id}",
            f"session:user:{user_id}*",
            f"do_api:*user:{user_id}*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = await self.delete_pattern(pattern)
            total_deleted += deleted
        
        logger.info(f"🧹 Invalidated {total_deleted} cache entries for user {user_id}")
        return total_deleted
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.redis_client:
            return {"error": "Redis not available"}
        
        try:
            info = await self.redis_client.info()
            keyspace_info = await self.redis_client.info('keyspace')
            
            # Count WinCloud-specific keys
            our_keys = await self.redis_client.keys(f"{self.key_prefix}*")
            
            return {
                "redis_version": info.get('redis_version'),
                "used_memory": info.get('used_memory_human'),
                "connected_clients": info.get('connected_clients'),
                "total_keys": len(our_keys),
                "keyspace_info": keyspace_info,
                "uptime_seconds": info.get('uptime_in_seconds'),
                "cache_hit_ratio": "N/A"  # Would need separate tracking
            }
        except Exception as e:
            logger.error(f"❌ Error getting cache stats: {e}")
            return {"error": str(e)}
    
    async def warm_cache(self, user_id: str = None) -> Dict[str, Any]:
        """Warm up cache with commonly used data"""
        warmed_items = []
        
        try:
            if user_id:
                # Warm user-specific cache
                logger.info(f"🔥 Warming cache for user {user_id}")
                # This would typically load user's droplets, preferences, etc.
                warmed_items.append(f"user_data:{user_id}")
            
            # Warm system-wide cache
            logger.info("🔥 Warming system cache")
            # Cache system metrics, DO regions, sizes, etc.
            warmed_items.extend(["system_metrics", "do_regions", "do_sizes"])
            
            return {
                "success": True,
                "warmed_items": warmed_items,
                "message": f"Cache warmed with {len(warmed_items)} items"
            }
        except Exception as e:
            logger.error(f"❌ Error warming cache: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Global cache service instance
cache_service = CacheService()

# Cache decorator for easy use
def cached(ttl: int = 300, key_prefix: str = "api"):
    """Easy-to-use cache decorator"""
    return cache_service.cache_result(ttl=ttl, key_prefix=key_prefix)

# Convenience functions
async def get_cache() -> CacheService:
    """Get cache service instance"""
    if not cache_service.redis_client:
        await cache_service.initialize()
    return cache_service

async def invalidate_user_cache(user_id: str) -> int:
    """Invalidate all cache for a user"""
    service = await get_cache()
    return await service.invalidate_all_user_cache(user_id)

async def cache_droplets(user_id: str, droplets: List[Dict], ttl: int = 60) -> bool:
    """Cache user droplets"""
    service = await get_cache()
    return await service.cache_droplet_list(user_id, droplets, ttl)

async def get_cached_droplets(user_id: str) -> Optional[List[Dict]]:
    """Get cached droplets"""
    service = await get_cache()
    return await service.get_cached_droplets(user_id)
