import httpx
from typing import Optional, Dict, List, Any
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class DigitalOceanService:
    """Service for interacting with DigitalOcean API"""
    
    def __init__(self, api_token: str):
        self.api_token = api_token
        self.base_url = "https://api.digitalocean.com/v2"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """Make HTTP request to DigitalOcean API with retry logic"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=f"{self.base_url}{endpoint}",
                    headers=self.headers,
                    json=data,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json() if response.text else {}
            except httpx.HTTPStatusError as e:
                logger.error(f"DigitalOcean API error: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error making request to DigitalOcean: {str(e)}")
                raise
    
    async def create_droplet(
        self,
        name: str,
        region: str,
        size: str,
        image: str = "ubuntu-22-04-x64",
        ssh_keys: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        user_data: Optional[str] = None
    ) -> Dict:
        """Create a new droplet"""
        data = {
            "name": name,
            "region": region,
            "size": size,
            "image": image,
            "ssh_keys": ssh_keys or [],
            "backups": False,
            "ipv6": True,
            "monitoring": True,
            "tags": tags or []
        }
        
        if user_data:
            data["user_data"] = user_data
        
        result = await self._make_request("POST", "/droplets", data)
        return result.get("droplet", {})
    
    async def get_droplet(self, droplet_id: int) -> Dict:
        """Get droplet details"""
        result = await self._make_request("GET", f"/droplets/{droplet_id}")
        return result.get("droplet", {})
    
    async def list_droplets(self, tag_name: Optional[str] = None) -> List[Dict]:
        """List all droplets, optionally filtered by tag"""
        params = {"tag_name": tag_name} if tag_name else {}
        result = await self._make_request("GET", "/droplets", params=params)
        return result.get("droplets", [])
    
    async def delete_droplet(self, droplet_id: int) -> bool:
        """Delete a droplet"""
        try:
            await self._make_request("DELETE", f"/droplets/{droplet_id}")
            return True
        except Exception:
            return False
    
    async def reboot_droplet(self, droplet_id: int) -> Dict:
        """Reboot a droplet"""
        data = {"type": "reboot"}
        result = await self._make_request("POST", f"/droplets/{droplet_id}/actions", data)
        return result.get("action", {})
    
    async def power_off_droplet(self, droplet_id: int) -> Dict:
        """Power off a droplet"""
        data = {"type": "power_off"}
        result = await self._make_request("POST", f"/droplets/{droplet_id}/actions", data)
        return result.get("action", {})
    
    async def power_on_droplet(self, droplet_id: int) -> Dict:
        """Power on a droplet"""
        data = {"type": "power_on"}
        result = await self._make_request("POST", f"/droplets/{droplet_id}/actions", data)
        return result.get("action", {})
    
    async def list_regions(self) -> List[Dict]:
        """List all available regions"""
        result = await self._make_request("GET", "/regions")
        return result.get("regions", [])
    
    async def list_sizes(self) -> List[Dict]:
        """List all available sizes"""
        result = await self._make_request("GET", "/sizes")
        return result.get("sizes", [])
    
    async def list_images(self, type: str = "distribution") -> List[Dict]:
        """List available images"""
        params = {"type": type}
        result = await self._make_request("GET", "/images", params=params)
        return result.get("images", [])
    
    async def create_ssh_key(self, name: str, public_key: str) -> Dict:
        """Create a new SSH key"""
        data = {
            "name": name,
            "public_key": public_key
        }
        result = await self._make_request("POST", "/account/keys", data)
        return result.get("ssh_key", {})
    
    async def list_ssh_keys(self) -> List[Dict]:
        """List all SSH keys"""
        result = await self._make_request("GET", "/account/keys")
        return result.get("ssh_keys", [])
    
    async def get_action(self, droplet_id: int, action_id: int) -> Dict:
        """Get status of a droplet action"""
        result = await self._make_request("GET", f"/droplets/{droplet_id}/actions/{action_id}")
        return result.get("action", {})
    
    async def validate_token(self) -> bool:
        """Validate the API token"""
        try:
            await self._make_request("GET", "/account")
            return True
        except Exception:
            return False
