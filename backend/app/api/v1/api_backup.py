from fastapi import APIRouter

from app.api.v1 import droplets  # Re-enabled for droplet management
# from app.api.v1 import contact  # Contact form API
from app.api.v1 import settings_tokens  # Re-enabled for token management
from app.api.v1 import ssh_keys  # Re-enabled for SSH key management
from app.api.v1 import volumes  # Re-enabled for volume management
from app.api.v1 import analytics  # Re-enabled with role-based access
# from app.api.v1 import websocket_routes  # Temporarily disabled due to import error
from app.api.v1 import auth  # Enable auth routes
from app.api.v1 import simple_auth  # Simple auth for testing
from app.api.v1 import admin  # Admin routes
from app.api.v1 import admin_spaces  # Admin spaces management
from app.api.v1 import droplets_rbac  # Role-based droplet management
from app.api.v1 import accounts  # Updated accounts with role-based access
# DigitalOcean API endpoints (following DO documentation)
from app.api.v1 import regions, sizes, images, firewalls
from app.api.v1.endpoints import spaces, cdn, cache, health
# Public endpoints (no auth required) for Create VPS page
from app.api.v1 import public_resources
# from app.api.v1 import users  # Temporarily disabled
# from app.api.v1 import windows_builder, websocket, webhook  # Temporarily disabled
# from app.api.v1 import templates  # Temporarily disabled
# from app.api.v1 import monitoring  # Temporarily disabled

# Database monitoring and optimization
from app.api.v1 import database_monitor

# Enhanced security features
from app.api.v1 import security
from app.api.v1 import secure_tokens

from app.api.v1 import contact
api_router = APIRouter()

# Simple Authentication for testing
api_router.include_router(simple_auth.router, prefix="/api/v1", tags=["Authentication"])

# Contact form
api_router.include_router(contact.router, prefix="/api/v1", tags=["Contact"])

# Real Authentication
api_router.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])

# Admin routes (role-based access)
api_router.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# Admin Spaces routes (role-based access)
api_router.include_router(admin_spaces.router, prefix="/api/v1/admin", tags=["Admin-Spaces"])

# Role-based droplet management
api_router.include_router(droplets_rbac.router, prefix="/api/v1/droplets", tags=["Droplets"])

# Analytics with role-based access
api_router.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])

# Accounts with role-based access
api_router.include_router(accounts.router, prefix="/api/v1/accounts", tags=["Accounts"])

# Settings and tokens management
# api_router.include_router(droplets.router, prefix="/droplets", tags=["droplets"])  # Disabled due to syntax error
api_router.include_router(settings_tokens.router, prefix="/settings", tags=["settings"])
# api_router.include_router(ssh_keys.router, prefix="/ssh-keys", tags=["ssh_keys"])  # Disabled
api_router.include_router(volumes.router, prefix="/api/v1/volumes", tags=["volumes"])  # Re-enabled
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
# api_router.include_router(websocket_routes.router, prefix="/websocket", tags=["websocket"])  # Disabled
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])  # Enable auth routes
api_router.include_router(simple_auth.router, prefix="/simple-auth", tags=["simple-auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(droplets_rbac.router, prefix="/droplets", tags=["droplets"])  # Role-based droplet access
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])  # Role-based account access
# DigitalOcean API endpoints (following DO documentation)
api_router.include_router(regions.router, prefix="/regions", tags=["regions"])
api_router.include_router(sizes.router, prefix="/sizes", tags=["sizes"])  
api_router.include_router(images.router, prefix="/images", tags=["images"])
api_router.include_router(firewalls.router, prefix="/firewalls", tags=["firewalls"])
api_router.include_router(spaces.router, prefix="/spaces", tags=["spaces"])
api_router.include_router(cdn.router, prefix="/cdn", tags=["cdn"])
api_router.include_router(cache.router, prefix="/cache", tags=["cache"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
# Public endpoints (no auth required) for Create VPS page
api_router.include_router(public_resources.router, tags=["public"])

# Database monitoring and optimization (Admin only)
api_router.include_router(database_monitor.router, prefix="/database", tags=["database-monitoring"])

# Enhanced security features
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(secure_tokens.router, prefix="/secure", tags=["secure-tokens"])

# api_router.include_router(users.router, prefix="/users", tags=["users"])  # Disabled
# api_router.include_router(windows_builder.router, prefix="/windows-builder", tags=["windows_builder"])  # Disabled
# api_router.include_router(websocket.router, prefix="/websocket", tags=["websocket"])  # Disabled
# api_router.include_router(webhook.router, prefix="/webhook", tags=["webhook"])  # Disabled
# api_router.include_router(templates.router, prefix="/templates", tags=["templates"])  # Disabled
# api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])  # Disabled

# api_router.include_router(websocket_routes.router, tags=["WebSocket"])
# api_router.include_router(volumes.router, prefix="/volumes", tags=["Volumes"])
# api_router.include_router(ssh_keys.router, tags=["SSH Keys"])

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint for API"""
    return {"status": "healthy", "api": "v1"}

# Windows builder routes - Temporarily disabled
# api_router.include_router(windows_builder.router, prefix="/windows", tags=["Windows Builder"])

# Template management routes - Temporarily disabled
# api_router.include_router(templates.router, prefix="/templates", tags=["Templates"])

# Analytics routes - ENABLED (see line 34)
# Duplicate removed - analytics.router already included above

# Monitoring routes - Temporarily disabled
# api_router.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])

# WebSocket routes - Temporarily disabled
# api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Webhook routes - Temporarily disabled  
# api_router.include_router(webhook.router, prefix="/webhook", tags=["Webhooks"])
