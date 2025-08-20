"""
Enhanced Health Check Endpoints for WinCloud Builder
Provides comprehensive system health monitoring including cache status
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from datetime import datetime
import psutil
import time

from app.core.cache import check_cache_health
from app.services.cache_service import cache_service
from app.core.database import engine
from app.api.deps import get_current_user
from app.models.auth_models import User

router = APIRouter()

@router.get("/", summary="Basic Health Check")
async def basic_health():
    """
    Basic health check endpoint
    Returns simple status for load balancer health checks
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "WinCloud Builder API"
    }

@router.get("/detailed", summary="Detailed Health Check")
async def detailed_health():
    """
    Detailed health check including all system components
    """
    start_time = time.time()
    
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "WinCloud Builder API",
        "version": "2.0.0",
        "components": {}
    }
    
    # Database health
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        health_status["components"]["database"] = {
            "status": "healthy",
            "type": "PostgreSQL"
        }
    except Exception as e:
        health_status["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e),
            "type": "PostgreSQL"
        }
        health_status["status"] = "degraded"
    
    # Cache health
    try:
        cache_health = await check_cache_health()
        health_status["components"]["cache"] = cache_health
        
        if cache_health["status"] != "healthy":
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["components"]["cache"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # System resources
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_status["components"]["system"] = {
            "status": "healthy",
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent,
            "available_memory_gb": round(memory.available / (1024**3), 2),
            "available_disk_gb": round(disk.free / (1024**3), 2)
        }
        
        # Mark as degraded if resources are high
        if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
            health_status["components"]["system"]["status"] = "degraded"
            health_status["status"] = "degraded"
            
    except Exception as e:
        health_status["components"]["system"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health_status["status"] = "degraded"
    
    # Response time
    response_time = round((time.time() - start_time) * 1000, 2)
    health_status["response_time_ms"] = response_time
    
    if response_time > 5000:  # 5 seconds
        health_status["status"] = "degraded"
    
    return health_status

@router.get("/cache", summary="Cache System Health")
async def cache_health():
    """
    Specific health check for cache system
    """
    try:
        cache_health = await check_cache_health()
        
        # Test cache operations
        test_key = "health_check_test"
        test_value = {"timestamp": datetime.utcnow().isoformat()}
        
        # Test set/get/delete operations
        set_success = await cache_service.set(test_key, test_value, 60)
        get_result = await cache_service.get(test_key)
        delete_success = await cache_service.delete(test_key)
        
        operations_test = {
            "set_operation": "success" if set_success else "failed",
            "get_operation": "success" if get_result == test_value else "failed",
            "delete_operation": "success" if delete_success else "failed"
        }
        
        return {
            "cache_health": cache_health,
            "operations_test": operations_test,
            "overall_status": "healthy" if all([
                cache_health["status"] == "healthy",
                set_success,
                get_result == test_value,
                delete_success
            ]) else "unhealthy"
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/database", summary="Database Health Check")
async def database_health():
    """
    Specific health check for database
    """
    try:
        start_time = time.time()
        
        with engine.connect() as conn:
            # Test basic query
            result = conn.execute("SELECT version(), current_timestamp")
            version_info = result.fetchone()
            
            # Test performance
            conn.execute("SELECT COUNT(*) FROM information_schema.tables")
        
        query_time = round((time.time() - start_time) * 1000, 2)
        
        return {
            "status": "healthy",
            "database_version": version_info[0] if version_info else "unknown",
            "query_time_ms": query_time,
            "timestamp": datetime.utcnow().isoformat(),
            "connection_pool": {
                "size": engine.pool.size(),
                "checked_in": engine.pool.checkedin(),
                "checked_out": engine.pool.checkedout(),
                "overflow": engine.pool.overflow()
            }
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/metrics", summary="System Metrics")
async def system_metrics(
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed system metrics
    Requires authentication
    """
    try:
        # CPU information
        cpu_info = {
            "percent": psutil.cpu_percent(interval=1),
            "count": psutil.cpu_count(),
            "freq": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        }
        
        # Memory information
        memory = psutil.virtual_memory()
        memory_info = {
            "total_gb": round(memory.total / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "used_gb": round(memory.used / (1024**3), 2),
            "percent": memory.percent
        }
        
        # Disk information
        disk = psutil.disk_usage('/')
        disk_info = {
            "total_gb": round(disk.total / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "percent": round((disk.used / disk.total) * 100, 2)
        }
        
        # Network information
        network = psutil.net_io_counters()
        network_info = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv
        }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": cpu_info,
            "memory": memory_info,
            "disk": disk_info,
            "network": network_info,
            "uptime_seconds": time.time() - psutil.boot_time()
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/readiness", summary="Readiness Check")
async def readiness_check():
    """
    Kubernetes-style readiness check
    Returns 200 only if all critical components are ready
    """
    ready = True
    components = {}
    
    # Check database
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        components["database"] = "ready"
    except Exception:
        components["database"] = "not_ready"
        ready = False
    
    # Check cache
    try:
        cache_health = await check_cache_health()
        components["cache"] = "ready" if cache_health["status"] == "healthy" else "not_ready"
        if cache_health["status"] != "healthy":
            ready = False
    except Exception:
        components["cache"] = "not_ready"
        ready = False
    
    status_code = 200 if ready else 503
    
    return {
        "ready": ready,
        "components": components,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/liveness", summary="Liveness Check")
async def liveness_check():
    """
    Kubernetes-style liveness check
    Returns 200 if the application is alive (even if degraded)
    """
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "WinCloud Builder API"
    }
