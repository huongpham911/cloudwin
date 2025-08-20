from fastapi import APIRouter

# Core imports - enabled
from app.api.v1 import auth
from app.api.v1 import simple_auth  
from app.api.v1 import contact
from app.api.v1 import settings_tokens
from app.api.v1 import ssh_keys
from app.api.v1 import droplets
from app.api.v1 import droplets_rbac
from app.api.v1 import admin
from app.api.v1 import admin_spaces
from app.api.v1 import accounts
from app.api.v1 import volumes
from app.api.v1 import analytics

# DigitalOcean resources
from app.api.v1 import regions, sizes, images, firewalls
from app.api.v1.endpoints import spaces, cdn, cache, health
from app.api.v1 import public_resources

# Security and monitoring
from app.api.v1 import database_monitor
from app.api.v1 import security
from app.api.v1 import secure_tokens

# Temporarily disabled imports
# from app.api.v1 import users
# from app.api.v1 import windows_builder
# from app.api.v1 import templates 
# from app.api.v1 import monitoring
# from app.api.v1 import websocket_routes
# from app.api.v1 import forgot_password
# from app.api.v1 import verify_email
# from app.api.v1 import totp

api_router = APIRouter()

# Authentication - no prefix duplication
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(simple_auth.router, prefix="/simple-auth", tags=["Simple Auth"])

# Contact form
api_router.include_router(contact.router, prefix="/contact", tags=["Contact"])

# Admin routes
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(admin_spaces.router, prefix="/admin", tags=["Admin Spaces"])

# Core resources - no prefix here since main.py adds /api/v1
api_router.include_router(droplets.router, prefix="/droplets", tags=["Droplets"])
api_router.include_router(droplets_rbac.router, prefix="/droplets-rbac", tags=["Droplets RBAC"])
api_router.include_router(ssh_keys.router, prefix="/ssh_keys", tags=["SSH Keys"])
api_router.include_router(volumes.router, prefix="/volumes", tags=["Volumes"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

# Settings and tokens
api_router.include_router(settings_tokens.router, prefix="/settings", tags=["Settings & Tokens"])

# DigitalOcean resources
api_router.include_router(regions.router, prefix="/regions", tags=["Regions"])
api_router.include_router(sizes.router, prefix="/sizes", tags=["Sizes"])
api_router.include_router(images.router, prefix="/images", tags=["Images"])
api_router.include_router(firewalls.router, prefix="/firewalls", tags=["Firewalls"])

# Spaces and CDN
api_router.include_router(spaces.router, prefix="/spaces", tags=["Spaces"])
api_router.include_router(cdn.router, prefix="/cdn", tags=["CDN"])
api_router.include_router(cache.router, prefix="/cache", tags=["Cache"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])

# Public endpoints (no auth required)
api_router.include_router(public_resources.router, prefix="/public", tags=["Public Resources"])

# Security and monitoring
api_router.include_router(database_monitor.router, prefix="/database", tags=["Database Monitoring"])
api_router.include_router(security.router, prefix="/security", tags=["Security"])
api_router.include_router(secure_tokens.router, prefix="/secure-tokens", tags=["Secure Tokens"])

# Health check endpoint
@api_router.get("/health-check")
async def health_check():
    """Health check endpoint for API"""
    return {"status": "healthy", "api": "v1", "message": "WinCloud API is running"}
