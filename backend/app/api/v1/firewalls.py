"""
DigitalOcean Firewalls API endpoints
Based on: https://docs.digitalocean.com/reference/pydo/reference/firewalls/
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
import logging
from pydo import Client

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize DO clients
do_clients = []

def set_do_clients(clients):
    """Set DO clients from main app"""
    global do_clients
    do_clients = clients
    logger.info(f"✅ Firewalls module received {len(do_clients)} DO clients")

def load_tokens_secure():
    """Load tokens from enhanced secure token service"""
    user_tokens = []

    try:
        from app.services.enhanced_token_service import enhanced_token_service
        user_tokens = enhanced_token_service.get_all_valid_tokens()
        logger.info(f"✅ Firewalls API - Loaded {len(user_tokens)} encrypted tokens from secure storage")
    except Exception as e:
        logger.warning(f"⚠️ Firewalls API - Could not load secure tokens: {e}")
        return

    # Initialize DO clients
    global do_clients
    do_clients = []
    for i, token in enumerate(user_tokens):
        try:
            client = Client(token=token)
            masked_token = f"***...{token[-10:]}" if len(token) >= 10 else token
            do_clients.append({
                'client': client,
                'token': token,
                'masked_token': masked_token,
                'name': f'Secure Token {i+1}'
            })
            logger.info(f"✅ Firewalls API - Initialized DO client {i+1}: {masked_token}")
        except Exception as e:
            logger.error(f"❌ Firewalls API - Failed to initialize DO client {i+1}: {e}")
            continue

    logger.info(f"✅ Firewalls API - Total {len(do_clients)} DigitalOcean clients ready")

# Don't load tokens on module import - will be set by main app

# Pydantic models for request/response
class FirewallInboundRule(BaseModel):
    protocol: str  # tcp, udp, icmp
    ports: Optional[str] = None  # Port range (e.g., "22", "80-443", "all")
    sources: Optional[dict] = None  # {"addresses": ["0.0.0.0/0"], "tags": [], "droplet_ids": []}

class FirewallOutboundRule(BaseModel):
    protocol: str  # tcp, udp, icmp
    ports: Optional[str] = None  # Port range (e.g., "22", "80-443", "all")
    destinations: Optional[dict] = None  # {"addresses": ["0.0.0.0/0"], "tags": [], "droplet_ids": []}

class FirewallCreate(BaseModel):
    name: str
    inbound_rules: List[FirewallInboundRule] = []
    outbound_rules: List[FirewallOutboundRule] = []
    droplet_ids: List[int] = []
    tags: List[str] = []

class FirewallUpdate(BaseModel):
    name: Optional[str] = None
    inbound_rules: Optional[List[FirewallInboundRule]] = None
    outbound_rules: Optional[List[FirewallOutboundRule]] = None

class FirewallAssignDroplets(BaseModel):
    droplet_ids: List[int]

class FirewallRemoveDroplets(BaseModel):
    droplet_ids: List[int]

def get_do_client():
    """Get the first available DO client"""
    if not do_clients:
        raise HTTPException(status_code=503, detail="No DigitalOcean clients available")
    return do_clients[0]['client']

@router.get("/")
async def list_firewalls(
    page: int = 1,
    per_page: int = 20
):
    """
    List all firewalls
    """
    try:
        client = get_do_client()
        
        # Get firewalls with pagination
        resp = client.firewalls.list(page=page, per_page=per_page)
        
        # Handle both dict and object response formats
        if hasattr(resp, 'firewalls'):
            firewalls = resp.firewalls
            links = getattr(resp, 'links', {})
            meta = getattr(resp, 'meta', {})
        else:
            firewalls = resp.get('firewalls', [])
            links = resp.get('links', {})
            meta = resp.get('meta', {})
        
        return {
            "firewalls": firewalls,
            "links": links,
            "meta": meta
        }
        
    except Exception as e:
        logger.error(f"Error listing firewalls: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list firewalls: {str(e)}")

@router.post("/")
async def create_firewall(
    firewall_data: FirewallCreate
):
    """
    Create a new firewall
    """
    try:
        client = get_do_client()
        
        # Prepare firewall creation data
        body = {
            "name": firewall_data.name,
            "inbound_rules": [rule.dict() for rule in firewall_data.inbound_rules],
            "outbound_rules": [rule.dict() for rule in firewall_data.outbound_rules],
            "droplet_ids": firewall_data.droplet_ids,
            "tags": firewall_data.tags
        }
        
        resp = client.firewalls.create(body=body)
        
        # Handle both dict and object response formats
        if hasattr(resp, 'firewall'):
            return resp.firewall
        else:
            return resp.get('firewall', {})
        
    except Exception as e:
        logger.error(f"Error creating firewall: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create firewall: {str(e)}")

@router.get("/{firewall_id}")
async def get_firewall(
    firewall_id: str
):
    """
    Retrieve an existing firewall
    """
    try:
        client = get_do_client()
        
        resp = client.firewalls.get(firewall_id=firewall_id)
        
        # Handle both dict and object response formats
        if hasattr(resp, 'firewall'):
            return resp.firewall
        else:
            return resp.get('firewall', {})
        
    except Exception as e:
        logger.error(f"Error getting firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get firewall: {str(e)}")

@router.put("/{firewall_id}")
async def update_firewall(
    firewall_id: str,
    firewall_data: FirewallUpdate
):
    """
    Update a firewall
    """
    try:
        client = get_do_client()
        
        # Prepare update data (only include non-None fields)
        body = {}
        if firewall_data.name is not None:
            body["name"] = firewall_data.name
        if firewall_data.inbound_rules is not None:
            body["inbound_rules"] = [rule.dict() for rule in firewall_data.inbound_rules]
        if firewall_data.outbound_rules is not None:
            body["outbound_rules"] = [rule.dict() for rule in firewall_data.outbound_rules]
        
        resp = client.firewalls.update(firewall_id=firewall_id, body=body)
        
        # Handle both dict and object response formats
        if hasattr(resp, 'firewall'):
            return resp.firewall
        else:
            return resp.get('firewall', {})
        
    except Exception as e:
        logger.error(f"Error updating firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update firewall: {str(e)}")

@router.delete("/{firewall_id}")
async def delete_firewall(
    firewall_id: str
):
    """
    Delete a firewall
    """
    try:
        client = get_do_client()
        
        # Use correct PyDO method name: delete() not destroy()
        client.firewalls.delete(firewall_id=firewall_id)
        
        return {"message": f"Firewall {firewall_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete firewall: {str(e)}")

@router.post("/{firewall_id}/droplets")
async def assign_droplets_to_firewall(
    firewall_id: str,
    droplet_data: FirewallAssignDroplets
):
    """
    Assign droplets to a firewall
    """
    try:
        client = get_do_client()
        
        body = {"droplet_ids": droplet_data.droplet_ids}
        
        client.firewalls.assign_droplets(firewall_id=firewall_id, body=body)
        
        return {"message": f"Droplets {droplet_data.droplet_ids} assigned to firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error assigning droplets to firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign droplets: {str(e)}")

@router.delete("/{firewall_id}/droplets")
async def remove_droplets_from_firewall(
    firewall_id: str,
    droplet_data: FirewallRemoveDroplets
):
    """
    Remove droplets from a firewall
    """
    try:
        client = get_do_client()
        
        body = {"droplet_ids": droplet_data.droplet_ids}
        
        # Use correct PyDO method name: delete_droplets() not remove_droplets()
        client.firewalls.delete_droplets(firewall_id=firewall_id, body=body)
        
        return {"message": f"Droplets {droplet_data.droplet_ids} removed from firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error removing droplets from firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove droplets: {str(e)}")

@router.post("/{firewall_id}/rules")
async def add_firewall_rules(
    firewall_id: str,
    rules_data: dict
):
    """
    Add rules to a firewall
    Expected format: {"inbound_rules": [...], "outbound_rules": [...]}
    """
    try:
        client = get_do_client()
        
        client.firewalls.add_rules(firewall_id=firewall_id, body=rules_data)
        
        return {"message": f"Rules added to firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error adding rules to firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add firewall rules: {str(e)}")

@router.delete("/{firewall_id}/rules")
async def remove_firewall_rules(
    firewall_id: str,
    rules_data: dict
):
    """
    Remove rules from a firewall
    Expected format: {"inbound_rules": [...], "outbound_rules": [...]}
    """
    try:
        client = get_do_client()
        
        # Use correct PyDO method name: delete_rules() not remove_rules()
        client.firewalls.delete_rules(firewall_id=firewall_id, body=rules_data)
        
        return {"message": f"Rules removed from firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error removing rules from firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove firewall rules: {str(e)}")

@router.get("/droplet/{droplet_id}")
async def get_droplet_firewalls(
    droplet_id: int
):
    """
    Get all firewalls assigned to a specific droplet
    """
    try:
        client = get_do_client()
        
        # Get all firewalls and filter by droplet_id
        resp = client.firewalls.list()
        
        # Handle both dict and object response formats
        if hasattr(resp, 'firewalls'):
            all_firewalls = resp.firewalls
        else:
            all_firewalls = resp.get('firewalls', [])
        
        # Filter firewalls that contain this droplet
        droplet_firewalls = [
            firewall for firewall in all_firewalls 
            if droplet_id in firewall.get('droplet_ids', [])
        ]
        
        return {
            "firewalls": droplet_firewalls,
            "count": len(droplet_firewalls)
        }
        
    except Exception as e:
        logger.error(f"Error getting firewalls for droplet {droplet_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get droplet firewalls: {str(e)}")

# Additional PyDO methods based on official documentation
class FirewallTags(BaseModel):
    tags: List[str]

@router.post("/{firewall_id}/tags")
async def add_tags_to_firewall(
    firewall_id: str,
    tag_data: FirewallTags
):
    """
    Add tags to a firewall
    """
    try:
        client = get_do_client()
        
        body = {"tags": tag_data.tags}
        
        client.firewalls.add_tags(firewall_id=firewall_id, body=body)
        
        return {"message": f"Tags {tag_data.tags} added to firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error adding tags to firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add tags: {str(e)}")

@router.delete("/{firewall_id}/tags")
async def remove_tags_from_firewall(
    firewall_id: str,
    tag_data: FirewallTags
):
    """
    Remove tags from a firewall
    """
    try:
        client = get_do_client()
        
        body = {"tags": tag_data.tags}
        
        client.firewalls.delete_tags(firewall_id=firewall_id, body=body)
        
        return {"message": f"Tags {tag_data.tags} removed from firewall {firewall_id}"}
        
    except Exception as e:
        logger.error(f"Error removing tags from firewall {firewall_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove tags: {str(e)}")

# Predefined firewall templates for common use cases
@router.get("/templates")
async def get_firewall_templates():
    """
    Get predefined firewall templates for common use cases
    """
    templates = {
        "web_server": {
            "name": "Web Server",
            "description": "Basic web server with HTTP/HTTPS access",
            "inbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "22",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "80",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "443",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                }
            ],
            "outbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "udp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "icmp",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                }
            ]
        },
        "database_server": {
            "name": "Database Server",
            "description": "Database server with restricted access",
            "inbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "22",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "3306",
                    "sources": {"tags": ["web-servers"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "5432",
                    "sources": {"tags": ["web-servers"]}
                }
            ],
            "outbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "80",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "443",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "udp",
                    "ports": "53",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                }
            ]
        },
        "ssh_only": {
            "name": "SSH Only",
            "description": "Minimal firewall allowing only SSH access",
            "inbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "22",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                }
            ],
            "outbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "udp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "icmp",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                }
            ]
        },
        "docker_swarm": {
            "name": "Docker Swarm",
            "description": "Docker Swarm cluster communication",
            "inbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "22",
                    "sources": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "2376",
                    "sources": {"tags": ["docker-swarm"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "2377",
                    "sources": {"tags": ["docker-swarm"]}
                },
                {
                    "protocol": "tcp",
                    "ports": "7946",
                    "sources": {"tags": ["docker-swarm"]}
                },
                {
                    "protocol": "udp",
                    "ports": "7946",
                    "sources": {"tags": ["docker-swarm"]}
                },
                {
                    "protocol": "udp",
                    "ports": "4789",
                    "sources": {"tags": ["docker-swarm"]}
                }
            ],
            "outbound_rules": [
                {
                    "protocol": "tcp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "udp",
                    "ports": "all",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                },
                {
                    "protocol": "icmp",
                    "destinations": {"addresses": ["127.0.0.1/32"]}
                }
            ]
        }
    }
    
    return {"templates": templates}

@router.post("/from-template")
async def create_firewall_from_template(
    template_data: dict
):
    """
    Create a firewall from a predefined template
    Expected format: {"template_name": "web_server", "firewall_name": "my-web-firewall", "droplet_ids": []}
    """
    try:
        # Get templates
        templates_resp = await get_firewall_templates()
        templates = templates_resp["templates"]
        
        template_name = template_data.get("template_name")
        firewall_name = template_data.get("firewall_name", f"{template_name}-firewall")
        droplet_ids = template_data.get("droplet_ids", [])
        tags = template_data.get("tags", [])
        
        if template_name not in templates:
            raise HTTPException(status_code=400, detail=f"Template '{template_name}' not found")
        
        template = templates[template_name]
        
        # Create firewall with template data
        firewall_data = FirewallCreate(
            name=firewall_name,
            inbound_rules=[FirewallInboundRule(**rule) for rule in template["inbound_rules"]],
            outbound_rules=[FirewallOutboundRule(**rule) for rule in template["outbound_rules"]],
            droplet_ids=droplet_ids,
            tags=tags
        )
        
        return await create_firewall(firewall_data)
        
    except Exception as e:
        logger.error(f"Error creating firewall from template: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create firewall from template: {str(e)}")
