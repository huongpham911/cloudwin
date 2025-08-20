"""
Core Cache Configuration and Utilities for WinCloud Builder
Provides cache configuration, initialization, and common cache patterns
"""

import json
import asyncio
from typing import Any, Dict, Optional, Union
from datetime import datetime, timedelta
import logging

import redis.asyncio as redis
from fastapi import Depends

from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheConfig:
    """Cache configuration and constants"""
    
    # Cache TTL Constants (seconds)
    TTL_VERY_SHORT = 60          # 1 minute - Real-time data
    TTL_SHORT = 300              # 5 minutes - API responses
    TTL_MEDIUM = 1800            # 30 minutes - User sessions
    TTL_LONG = 3600              # 1 hour - System data
    TTL_VERY_LONG = 86400        # 24 hours - Static data
    
    # Cache Key Prefixes
    PREFIX_USER = "user:"
    PREFIX_DROPLET = "droplet:"
    PREFIX_API = "api:"
    PREFIX_SYSTEM = "system:"
    PREFIX_SESSION = "session:"
    PREFIX_SECURITY = "security:"
    
    # Cache Databases (Redis DB numbers)
    DB_GENERAL = 0       # General caching
    DB_RATE_LIMIT = 1    # Rate limiting
    DB_SECURITY = 2      # Security features
    DB_CACHE = 3         # Application cache
    DB_SESSION = 4       # User sessions

class RedisManager:
    """Redis connection manager for different use cases"""
    
    def __init__(self):
        self.connections: Dict[str, redis.Redis] = {}
        self.base_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
    
    async def get_connection(self, db: int = CacheConfig.DB_CACHE) -> redis.Redis:
        """Get Redis connection for specific database"""
        conn_key = f"db_{db}"
        
        if conn_key not in self.connections:
            try:
                redis_url = f"{self.base_url}/{db}"
                connection = redis.from_url(redis_url, decode_responses=True)
                await connection.ping()
                self.connections[conn_key] = connection
                logger.info(f"🔴 Redis connection established for DB {db}")
            except Exception as e:
                logger.error(f"❌ Failed to connect to Redis DB {db}: {e}")
                raise
        
        return self.connections[conn_key]
    
    async def close_all_connections(self):
        """Close all Redis connections"""
        for conn_key, connection in self.connections.items():
            try:
                await connection.close()
                logger.info(f"🔴 Closed Redis connection: {conn_key}")
            except Exception as e:
                logger.error(f"❌ Error closing Redis connection {conn_key}: {e}")
        
        self.connections.clear()

# Global Redis manager
redis_manager = RedisManager()

class CacheKey:
    """Cache key generator with consistent naming"""
    
    @staticmethod
    def user_droplets(user_id: str) -> str:
        """Generate cache key for user droplets"""
        return f"{CacheConfig.PREFIX_USER}{user_id}:droplets"
    
    @staticmethod
    def user_preferences(user_id: str) -> str:
        """Generate cache key for user preferences"""
        return f"{CacheConfig.PREFIX_USER}{user_id}:preferences"
    
    @staticmethod
    def droplet_details(droplet_id: str) -> str:
        """Generate cache key for droplet details"""
        return f"{CacheConfig.PREFIX_DROPLET}{droplet_id}:details"
    
    @staticmethod
    def api_response(endpoint: str, params_hash: str) -> str:
        """Generate cache key for API responses"""
        return f"{CacheConfig.PREFIX_API}{endpoint}:{params_hash}"
    
    @staticmethod
    def system_metrics() -> str:
        """Generate cache key for system metrics"""
        return f"{CacheConfig.PREFIX_SYSTEM}metrics"
    
    @staticmethod
    def do_regions() -> str:
        """Generate cache key for DigitalOcean regions"""
        return f"{CacheConfig.PREFIX_SYSTEM}do:regions"
    
    @staticmethod
    def do_sizes() -> str:
        """Generate cache key for DigitalOcean sizes"""
        return f"{CacheConfig.PREFIX_SYSTEM}do:sizes"
    
    @staticmethod
    def do_images() -> str:
        """Generate cache key for DigitalOcean images"""
        return f"{CacheConfig.PREFIX_SYSTEM}do:images"
    
    @staticmethod
    def user_session(user_id: str, session_id: str) -> str:
        """Generate cache key for user sessions"""
        return f"{CacheConfig.PREFIX_SESSION}{user_id}:{session_id}"
    
    @staticmethod
    def rate_limit(identifier: str, endpoint: str) -> str:
        """Generate cache key for rate limiting"""
        return f"rate_limit:{identifier}:{endpoint}"
    
    @staticmethod
    def failed_login(ip_address: str) -> str:
        """Generate cache key for failed login attempts"""
        return f"{CacheConfig.PREFIX_SECURITY}failed_login:{ip_address}"

class CacheSerializer:
    """Handle serialization/deserialization for cache values"""
    
    @staticmethod
    def serialize(value: Any) -> str:
        """Serialize value for Redis storage"""
        if isinstance(value, (dict, list)):
            return json.dumps(value, default=str)
        elif isinstance(value, (datetime,)):
            return value.isoformat()
        else:
            return str(value)
    
    @staticmethod
    def deserialize(value: str, value_type: type = dict) -> Any:
        """Deserialize value from Redis"""
        try:
            if value_type in (dict, list):
                return json.loads(value)
            elif value_type == datetime:
                return datetime.fromisoformat(value)
            elif value_type == int:
                return int(value)
            elif value_type == float:
                return float(value)
            else:
                return value
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"❌ Deserialization error: {e}")
            return None

async def get_cache_connection(db: int = CacheConfig.DB_CACHE) -> redis.Redis:
    """Dependency to get Redis connection"""
    return await redis_manager.get_connection(db)

async def get_rate_limit_connection() -> redis.Redis:
    """Dependency to get rate limiting Redis connection"""
    return await redis_manager.get_connection(CacheConfig.DB_RATE_LIMIT)

async def get_session_connection() -> redis.Redis:
    """Dependency to get session Redis connection"""
    return await redis_manager.get_connection(CacheConfig.DB_SESSION)

class CacheStats:
    """Cache statistics and monitoring"""
    
    def __init__(self, redis_conn: redis.Redis):
        self.redis_conn = redis_conn
    
    async def get_memory_usage(self) -> Dict[str, Any]:
        """Get Redis memory usage statistics"""
        try:
            info = await self.redis_conn.info('memory')
            return {
                "used_memory": info.get('used_memory'),
                "used_memory_human": info.get('used_memory_human'),
                "used_memory_peak": info.get('used_memory_peak'),
                "used_memory_peak_human": info.get('used_memory_peak_human'),
                "memory_fragmentation_ratio": info.get('mem_fragmentation_ratio')
            }
        except Exception as e:
            logger.error(f"❌ Error getting memory stats: {e}")
            return {}
    
    async def get_keyspace_info(self) -> Dict[str, Any]:
        """Get keyspace information"""
        try:
            info = await self.redis_conn.info('keyspace')
            return info
        except Exception as e:
            logger.error(f"❌ Error getting keyspace info: {e}")
            return {}
    
    async def count_keys_by_prefix(self, prefix: str) -> int:
        """Count keys with specific prefix"""
        try:
            keys = await self.redis_conn.keys(f"{prefix}*")
            return len(keys)
        except Exception as e:
            logger.error(f"❌ Error counting keys with prefix {prefix}: {e}")
            return 0

async def initialize_cache_system():
    """Initialize cache system on application startup"""
    try:
        # Test connections to all cache databases
        for db in [
            CacheConfig.DB_GENERAL,
            CacheConfig.DB_RATE_LIMIT,
            CacheConfig.DB_SECURITY,
            CacheConfig.DB_CACHE,
            CacheConfig.DB_SESSION
        ]:
            await redis_manager.get_connection(db)
        
        logger.info("✅ Cache system initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to initialize cache system: {e}")
        return False

async def cleanup_cache_system():
    """Cleanup cache system on application shutdown"""
    try:
        await redis_manager.close_all_connections()
        logger.info("✅ Cache system cleaned up successfully")
    except Exception as e:
        logger.error(f"❌ Error during cache cleanup: {e}")

# Cache health check
async def check_cache_health() -> Dict[str, Any]:
    """Check cache system health"""
    health_status = {
        "status": "healthy",
        "databases": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    try:
        for db_name, db_num in [
            ("general", CacheConfig.DB_GENERAL),
            ("rate_limit", CacheConfig.DB_RATE_LIMIT),
            ("security", CacheConfig.DB_SECURITY),
            ("cache", CacheConfig.DB_CACHE),
            ("session", CacheConfig.DB_SESSION)
        ]:
            try:
                conn = await redis_manager.get_connection(db_num)
                latency = await conn.ping()
                health_status["databases"][db_name] = {
                    "status": "healthy",
                    "latency_ms": latency * 1000 if isinstance(latency, float) else "N/A"
                }
            except Exception as e:
                health_status["databases"][db_name] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
                health_status["status"] = "degraded"
        
        return health_status
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
