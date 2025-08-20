"""
Cache Decorators and Utilities for WinCloud Builder
Provides convenient decorators for caching function results
"""

import hashlib
import asyncio
from functools import wraps
from typing import Any, Callable, Optional, Union
import logging

from app.services.cache_service import cache_service

logger = logging.getLogger(__name__)

def cache_api_response(ttl: int = 300, key_prefix: str = "api"):
    """
    Decorator to cache API response
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            func_name = func.__name__
            args_str = str(args) + str(kwargs)
            key_hash = hashlib.md5(args_str.encode()).hexdigest()
            cache_key = f"{key_prefix}:{func_name}:{key_hash}"
            
            # Try to get from cache
            cached_result = await cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"💾 Cache hit for {func_name}")
                return cached_result
            
            # Execute function and cache result
            logger.debug(f"🔄 Cache miss for {func_name}, executing...")
            result = await func(*args, **kwargs)
            
            # Cache the result
            await cache_service.set(cache_key, result, ttl)
            logger.debug(f"💾 Cached result for {func_name}")
            
            return result
        return wrapper
    return decorator

def cache_droplet_data(ttl: int = 60):
    """
    Decorator specifically for caching droplet-related data
    
    Args:
        ttl: Time to live in seconds (default: 1 minute for fresh data)
    """
    return cache_api_response(ttl=ttl, key_prefix="droplet")

def cache_do_api_call(ttl: int = 300):
    """
    Decorator for caching DigitalOcean API calls
    
    Args:
        ttl: Time to live in seconds (default: 5 minutes)
    """
    return cache_api_response(ttl=ttl, key_prefix="do_api")

def cache_user_data(ttl: int = 1800):
    """
    Decorator for caching user-specific data
    
    Args:
        ttl: Time to live in seconds (default: 30 minutes)
    """
    return cache_api_response(ttl=ttl, key_prefix="user_data")

def cache_system_data(ttl: int = 3600):
    """
    Decorator for caching system-wide data
    
    Args:
        ttl: Time to live in seconds (default: 1 hour)
    """
    return cache_api_response(ttl=ttl, key_prefix="system")

def invalidate_cache_on_change(cache_patterns: list):
    """
    Decorator to invalidate cache patterns when function executes
    Use for functions that modify data
    
    Args:
        cache_patterns: List of cache key patterns to invalidate
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Execute the function first
            result = await func(*args, **kwargs)
            
            # Invalidate cache patterns
            for pattern in cache_patterns:
                try:
                    deleted = await cache_service.delete_pattern(pattern)
                    logger.info(f"🗑️ Invalidated {deleted} cache entries for pattern: {pattern}")
                except Exception as e:
                    logger.error(f"❌ Error invalidating cache pattern {pattern}: {e}")
            
            return result
        return wrapper
    return decorator

async def cache_with_refresh(
    cache_key: str,
    fetch_function: Callable,
    ttl: int = 300,
    refresh_threshold: float = 0.8
):
    """
    Cache with background refresh functionality
    
    Args:
        cache_key: Key to use for caching
        fetch_function: Function to call to get fresh data
        ttl: Time to live in seconds
        refresh_threshold: Refresh cache when TTL is below this ratio (0.8 = 80% of TTL remaining)
    """
    # Check if we have cached data
    cached_data = await cache_service.get(cache_key)
    cache_ttl = await cache_service.get_ttl(cache_key)
    
    if cached_data is not None:
        # Check if we need to refresh in background
        if cache_ttl > 0 and cache_ttl < (ttl * refresh_threshold):
            # Schedule background refresh
            logger.info(f"🔄 Scheduling background refresh for {cache_key}")
            asyncio.create_task(_background_refresh(cache_key, fetch_function, ttl))
        
        return cached_data
    
    # No cached data, fetch and cache
    logger.info(f"🔄 Fetching fresh data for {cache_key}")
    fresh_data = await fetch_function()
    await cache_service.set(cache_key, fresh_data, ttl)
    
    return fresh_data

async def _background_refresh(cache_key: str, fetch_function: Callable, ttl: int):
    """Background task to refresh cache data"""
    try:
        fresh_data = await fetch_function()
        await cache_service.set(cache_key, fresh_data, ttl)
        logger.info(f"🔄 Background refresh completed for {cache_key}")
    except Exception as e:
        logger.error(f"❌ Background refresh failed for {cache_key}: {e}")

class CacheKeyBuilder:
    """Helper class to build consistent cache keys"""
    
    @staticmethod
    def user_droplets(user_id: str) -> str:
        return f"user:{user_id}:droplets"
    
    @staticmethod
    def droplet_details(droplet_id: str) -> str:
        return f"droplet:{droplet_id}:details"
    
    @staticmethod
    def do_api_call(endpoint: str, params: dict = None) -> str:
        params_hash = hashlib.md5(str(params or {}).encode()).hexdigest()
        return f"do_api:{endpoint}:{params_hash}"
    
    @staticmethod
    def user_preferences(user_id: str) -> str:
        return f"user:{user_id}:preferences"
    
    @staticmethod
    def system_metrics() -> str:
        return "system:metrics"

# Example usage patterns
"""
# Cache API response for 5 minutes
@cache_api_response(ttl=300)
async def get_user_droplets(user_id: str):
    # Your API logic here
    pass

# Cache droplet data for 1 minute
@cache_droplet_data(ttl=60)
async def get_droplet_status(droplet_id: str):
    # Your droplet logic here
    pass

# Cache DigitalOcean API call for 5 minutes
@cache_do_api_call(ttl=300)
async def fetch_do_regions():
    # Your DO API call here
    pass

# Invalidate cache when data changes
@invalidate_cache_on_change(["user:*:droplets", "droplet:*:details"])
async def create_droplet(user_id: str, droplet_data: dict):
    # Your droplet creation logic here
    pass

# Use cache with background refresh
async def get_system_status():
    return await cache_with_refresh(
        cache_key="system:status",
        fetch_function=fetch_system_status,
        ttl=300,
        refresh_threshold=0.8
    )
"""
