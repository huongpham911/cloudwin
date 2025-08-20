from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import redis.asyncio as redis
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.core.cache import initialize_cache_system, cleanup_cache_system
from app.api.v1.api import api_router
from app.middleware.security_middleware import SecurityMiddleware
from app.services.cache_service import cache_service
# from app.services.websocket_manager import websocket_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Redis client for caching and rate limiting
redis_client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    global redis_client
    
    # Startup
    logger.info("🚀 Starting WinCloud Builder Backend...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("📊 Database tables created/verified")
    
    # Initialize Redis connection
    try:
        redis_client = redis.from_url("redis://localhost:6379", decode_responses=True)
        await redis_client.ping()
        logger.info("🔴 Redis connection established")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e}")
        redis_client = None
    
    # Initialize cache system
    cache_initialized = await initialize_cache_system()
    if cache_initialized:
        await cache_service.initialize()
        logger.info("💾 Cache service initialized")
    else:
        logger.warning("⚠️ Cache service initialization failed")
    
    logger.info("✅ Application startup complete")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down WinCloud Builder Backend...")
    
    if redis_client:
        await redis_client.close()
        logger.info("🔴 Redis connection closed")
    
    # Cleanup cache system
    await cleanup_cache_system()
    logger.info("💾 Cache system cleaned up")
    
    logger.info("✅ Application shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for WinCloud Builder - Automated Windows RDP creation on DigitalOcean",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS Middleware (FIRST - before security checks)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wincloud.app",
        "https://www.wincloud.app", 
        "https://panel.wincloud.app",    # Control Panel
        "http://localhost:7000",         # Development
        "http://localhost:5173",         # Development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Add Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost", 
        "127.0.0.1", 
        "api.wincloud.app",
        "*.wincloud.app"
    ]
)

# Add Security Middleware (AFTER CORS) - Enhanced security enabled
app.add_middleware(SecurityMiddleware, enforce_https=False)  # Set to True in production

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "service": "WinCloud Builder Backend",
        "version": "1.0.0",
        "redis_connected": redis_client is not None
    }

# Images endpoint for frontend
@app.get("/images")
async def api_images():
    """Images endpoint for frontend compatibility"""
    images = [
        {
            "id": "win-server-2022",
            "name": "Windows Server 2022",
            "distribution": "Windows",
            "slug": "win-server-2022",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-01-01T00:00:00Z",
            "min_disk_size": 40,
            "size_gigabytes": 35,
            "description": "Full Windows Server 2022",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "server", "2022"]
        },
        {
            "id": "win11-pro",
            "name": "Windows 11 Pro",
            "distribution": "Windows",
            "slug": "win11-pro",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-06-01T00:00:00Z",
            "min_disk_size": 64,
            "size_gigabytes": 60,
            "description": "Windows 11 Professional with TPM bypass",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "desktop", "11", "pro"]
        },
        {
            "id": "win11-ltsc",
            "name": "Windows 11 LTSC",
            "distribution": "Windows",
            "slug": "win11-ltsc",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-03-01T00:00:00Z",
            "min_disk_size": 32,
            "size_gigabytes": 28,
            "description": "Windows 11 Enterprise LTSC - Long-term support",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "11", "ltsc", "enterprise"]
        },
        {
            "id": "win10-ltsc",
            "name": "Windows 10 LTSC",
            "distribution": "Windows",
            "slug": "win10-ltsc",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
            "created_at": "2022-01-01T00:00:00Z",
            "min_disk_size": 30,
            "size_gigabytes": 25,
            "description": "Lightweight Windows 10 for servers",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "10", "ltsc", "server"]
        },
        {
            "id": "tiny11",
            "name": "Tiny11",
            "distribution": "Windows",
            "slug": "tiny11",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
            "created_at": "2023-09-01T00:00:00Z",
            "min_disk_size": 20,
            "size_gigabytes": 18,
            "description": "Ultra-lightweight Windows 11 (2GB RAM minimum)",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "11", "tiny", "lightweight"]
        },
        {
            "id": "tiny10",
            "name": "Tiny10",
            "distribution": "Windows",
            "slug": "tiny10",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3"],
            "created_at": "2023-08-01T00:00:00Z",
            "min_disk_size": 20,
            "size_gigabytes": 16,
            "description": "Ultra-light Windows 10",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "10", "tiny", "lightweight"]
        }
    ]
    
    return {"data": images}

# Test images endpoint without auth
@app.get("/test-images")
async def test_images():
    """Test images endpoint without auth"""
    images = [
        {
            "id": "win-server-2022",
            "name": "Windows Server 2022",
            "distribution": "Windows",
            "slug": "win-server-2022",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-01-01T00:00:00Z",
            "min_disk_size": 40,
            "size_gigabytes": 35,
            "description": "Full Windows Server 2022",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "server", "2022"]
        },
        {
            "id": "win11-pro",
            "name": "Windows 11 Pro",
            "distribution": "Windows",
            "slug": "win11-pro",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-06-01T00:00:00Z",
            "min_disk_size": 64,
            "size_gigabytes": 60,
            "description": "Windows 11 Professional with TPM bypass",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "desktop", "11", "pro"]
        },
        {
            "id": "win11-ltsc",
            "name": "Windows 11 LTSC",
            "distribution": "Windows",
            "slug": "win11-ltsc",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1", "lon1"],
            "created_at": "2023-03-01T00:00:00Z",
            "min_disk_size": 32,
            "size_gigabytes": 28,
            "description": "Windows 11 Enterprise LTSC - Long-term support",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "11", "ltsc", "enterprise"]
        },
        {
            "id": "win10-ltsc",
            "name": "Windows 10 LTSC",
            "distribution": "Windows",
            "slug": "win10-ltsc",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
            "created_at": "2022-01-01T00:00:00Z",
            "min_disk_size": 30,
            "size_gigabytes": 25,
            "description": "Lightweight Windows 10 for servers",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "10", "ltsc", "server"]
        },
        {
            "id": "tiny11",
            "name": "Tiny11",
            "distribution": "Windows",
            "slug": "tiny11",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3", "sgp1"],
            "created_at": "2023-09-01T00:00:00Z",
            "min_disk_size": 20,
            "size_gigabytes": 18,
            "description": "Ultra-lightweight Windows 11 (2GB RAM minimum)",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "11", "tiny", "lightweight"]
        },
        {
            "id": "tiny10",
            "name": "Tiny10",
            "distribution": "Windows",
            "slug": "tiny10",
            "public": True,
            "regions": ["nyc1", "nyc3", "ams3"],
            "created_at": "2023-08-01T00:00:00Z",
            "min_disk_size": 20,
            "size_gigabytes": 16,
            "description": "Ultra-light Windows 10",
            "status": "available",
            "error_message": None,
            "tags": ["windows", "10", "tiny", "lightweight"]
        }
    ]
    
    return {"data": images}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "WinCloud Builder Backend API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "api_v1": settings.API_V1_STR
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}")
    return {
        "detail": "Internal server error",
        "path": str(request.url.path)
    }

# Make redis_client available globally
app.state.redis = redis_client

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )
