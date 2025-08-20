"""
DigitalOcean CDN Service
Manages CDN endpoints for DigitalOcean Spaces using PyDO SDK
Based on: https://docs.digitalocean.com/reference/pydo/reference/cdn/
"""

import pydo
import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class CDNService:
    """Service for managing DigitalOcean CDN endpoints using PyDO SDK"""
    
    def __init__(self, token: str = None):
        """Initialize CDN service with DigitalOcean token"""
        self.token = token or os.getenv('DIGITALOCEAN_TOKEN')
        if not self.token:
            raise ValueError("DigitalOcean token is required")
        
        self.client = pydo.Client(token=self.token)
        logger.info("🌐 CDN service initialized")

    async def list_endpoints(self, per_page: int = 25, page: int = 1) -> Dict[str, Any]:
        """
        List all CDN endpoints
        
        Args:
            per_page: Number of items per page (default: 25)
            page: Page number (default: 1)
            
        Returns:
            Dict containing CDN endpoints list and metadata
        """
        try:
            logger.info(f"📋 Listing CDN endpoints (page={page}, per_page={per_page})")
            
            response = self.client.cdn.list_endpoints()
            
            logger.info(f"🔍 Raw API response type: {type(response)}")
            logger.info(f"🔍 Raw API response: {response}")
            
            # Handle different response formats
            endpoints_list = []
            
            if isinstance(response, dict):
                if 'endpoints' in response:
                    endpoints_list = response['endpoints']
                    logger.info(f"✅ Retrieved {len(endpoints_list)} CDN endpoints from ['endpoints']")
                elif 'cdn_endpoints' in response:
                    endpoints_list = response['cdn_endpoints']
                    logger.info(f"✅ Retrieved {len(endpoints_list)} CDN endpoints from ['cdn_endpoints']")
                else:
                    logger.warning(f"⚠️ No endpoints field found in response: {list(response.keys())}")
            elif hasattr(response, 'endpoints') and not callable(response.endpoints):
                endpoints_list = response.endpoints
                logger.info(f"✅ Retrieved {len(endpoints_list)} CDN endpoints from .endpoints")
            elif hasattr(response, 'cdn_endpoints'):
                endpoints_list = response.cdn_endpoints
                logger.info(f"✅ Retrieved {len(endpoints_list)} CDN endpoints from .cdn_endpoints")
            else:
                logger.warning(f"⚠️ Unexpected response format: {type(response)} - {response}")
            
            # Ensure it's a list
            if not isinstance(endpoints_list, list):
                logger.warning(f"⚠️ endpoints_list is not a list: {type(endpoints_list)}")
                endpoints_list = []
            
            return {
                'endpoints': endpoints_list,
                'meta': getattr(response, 'meta', {}),
                'links': getattr(response, 'links', {})
            }
            
        except Exception as e:
            logger.error(f"❌ Error listing CDN endpoints: {str(e)}")
            raise

    async def get_endpoint(self, cdn_id: str) -> Dict[str, Any]:
        """
        Get details of a specific CDN endpoint
        
        Args:
            cdn_id: The ID of the CDN endpoint
            
        Returns:
            Dict containing CDN endpoint details
        """
        try:
            logger.info(f"🔍 Getting CDN endpoint: {cdn_id}")
            
            response = self.client.cdn.get_endpoint(cdn_id=cdn_id)
            
            logger.info(f"✅ Retrieved CDN endpoint: {response.get('endpoint', {}).get('origin', 'Unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error getting CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def create_endpoint(self, origin: str, ttl: Optional[int] = None, 
                            custom_domain: Optional[str] = None,
                            certificate_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new CDN endpoint
        
        Args:
            origin: The fully qualified domain name (FQDN) of a DigitalOcean Space
            ttl: Time to live in seconds (optional)
            custom_domain: Custom subdomain (optional, requires certificate_id)
            certificate_id: ID of DigitalOcean managed TLS certificate (optional)
            
        Returns:
            Dict containing created CDN endpoint details
        """
        try:
            logger.info(f"🆕 Creating CDN endpoint for origin: {origin}")
            
            body = {
                "origin": origin
            }
            
            if ttl is not None:
                body["ttl"] = ttl
                logger.info(f"⏰ Setting TTL: {ttl} seconds")
            
            if custom_domain and certificate_id:
                body["custom_domain"] = custom_domain
                body["certificate_id"] = certificate_id
                logger.info(f"🔒 Setting custom domain: {custom_domain} with certificate: {certificate_id}")
            elif custom_domain or certificate_id:
                logger.warning("⚠️ Both custom_domain and certificate_id are required for custom domain setup")
            
            logger.info(f"📋 Request body: {body}")
            response = self.client.cdn.create_endpoint(body=body)
            
            logger.info(f"✅ Created CDN endpoint for origin: {origin}")
            logger.info(f"📊 Response keys: {list(response.keys()) if isinstance(response, dict) else type(response)}")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Error creating CDN endpoint for {origin}: {str(e)}")
            raise

    async def update_endpoint(self, cdn_id: str, ttl: Optional[int] = None,
                            certificate_id: Optional[str] = None,
                            custom_domain: Optional[str] = None) -> Dict[str, Any]:
        """
        Update a CDN endpoint
        
        Args:
            cdn_id: The ID of the CDN endpoint to update
            ttl: New TTL value in seconds (optional)
            certificate_id: New certificate ID (optional)
            custom_domain: New custom domain (optional)
            
        Returns:
            Dict containing updated CDN endpoint details
        """
        try:
            logger.info(f"📝 Updating CDN endpoint: {cdn_id}")
            
            body = {}
            if ttl is not None:
                body["ttl"] = ttl
                logger.info(f"⏰ Updating TTL to: {ttl} seconds")
            
            if certificate_id is not None:
                body["certificate_id"] = certificate_id
                logger.info(f"🔒 Updating certificate to: {certificate_id}")
            
            if custom_domain is not None:
                body["custom_domain"] = custom_domain
                logger.info(f"🌐 Updating custom domain to: {custom_domain}")
            
            if not body:
                raise ValueError("At least one field (ttl, certificate_id, or custom_domain) must be provided for update")
            
            response = self.client.cdn.update_endpoints(cdn_id=cdn_id, body=body)
            
            logger.info(f"✅ Updated CDN endpoint: {cdn_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error updating CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def delete_endpoint(self, cdn_id: str) -> bool:
        """
        Delete a CDN endpoint
        
        Args:
            cdn_id: The ID of the CDN endpoint to delete
            
        Returns:
            True if deletion was successful
        """
        try:
            logger.info(f"🗑️ Deleting CDN endpoint: {cdn_id}")
            
            self.client.cdn.delete_endpoint(cdn_id=cdn_id)
            
            logger.info(f"✅ Deleted CDN endpoint: {cdn_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error deleting CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def purge_cache(self, cdn_id: str, files: List[str]) -> Dict[str, Any]:
        """
        Purge cached content from a CDN endpoint
        
        Args:
            cdn_id: The ID of the CDN endpoint
            files: List of file paths to purge. Use "*" for all files, 
                   "path/to/css/*" for directory, "path/to/image.png" for specific file
            
        Returns:
            Dict containing purge operation details
        """
        try:
            logger.info(f"🧹 Purging cache for CDN endpoint: {cdn_id}")
            logger.info(f"📁 Files to purge: {files}")
            
            if not files:
                raise ValueError("At least one file path must be provided for cache purge")
            
            # Validate file paths
            if len(files) > 50:
                logger.warning("⚠️ Rate limit: Maximum 50 files per 20 seconds")
            
            body = {
                "files": files
            }
            
            response = self.client.cdn.purge_cache(cdn_id=cdn_id, body=body)
            
            logger.info(f"✅ Cache purged for CDN endpoint: {cdn_id}")
            logger.info(f"📊 Response: {response}")
            
            return {
                "message": f"Cache purged successfully for {len(files)} file(s)",
                "cdn_id": cdn_id,
                "files_purged": files,
                "response": response
            }
            
        except Exception as e:
            logger.error(f"❌ Error purging cache for CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def purge_all_cache(self, cdn_id: str) -> Dict[str, Any]:
        """
        Purge all cached content from a CDN endpoint
        
        Args:
            cdn_id: The ID of the CDN endpoint
            
        Returns:
            Dict containing purge operation details
        """
        try:
            logger.info(f"🧹 Purging ALL cache for CDN endpoint: {cdn_id}")
            
            return await self.purge_cache(cdn_id, ["*"])
            
        except Exception as e:
            logger.error(f"❌ Error purging all cache for CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def get_endpoint_metrics(self, cdn_id: str) -> Dict[str, Any]:
        """
        Get performance metrics for a CDN endpoint
        Note: This may not be directly available through PyDO, but included for completeness
        
        Args:
            cdn_id: The ID of the CDN endpoint
            
        Returns:
            Dict containing metrics information
        """
        try:
            logger.info(f"📊 Getting metrics for CDN endpoint: {cdn_id}")
            
            # Get the endpoint details first
            endpoint_details = await self.get_endpoint(cdn_id)
            
            # For now, return the endpoint details with placeholder metrics
            metrics_info = {
                "cdn_id": cdn_id,
                "endpoint_details": endpoint_details,
                "metrics": {
                    "requests_count": "N/A",
                    "bandwidth_usage": "N/A",
                    "cache_hit_ratio": "N/A",
                    "note": "Detailed metrics not yet available through PyDO API"
                }
            }
            
            logger.info(f"✅ Retrieved metrics info for CDN endpoint: {cdn_id}")
            return metrics_info
            
        except Exception as e:
            logger.error(f"❌ Error getting metrics for CDN endpoint {cdn_id}: {str(e)}")
            raise

    async def validate_endpoint(self, cdn_id: str) -> Dict[str, Any]:
        """
        Validate a CDN endpoint by attempting to retrieve its details
        
        Args:
            cdn_id: The ID of the CDN endpoint to validate
            
        Returns:
            Dict containing validation results
        """
        try:
            logger.info(f"🔍 Validating CDN endpoint: {cdn_id}")
            
            endpoint_details = await self.get_endpoint(cdn_id)
            
            validation_result = {
                "valid": True,
                "cdn_id": cdn_id,
                "origin": endpoint_details.get('endpoint', {}).get('origin', 'Unknown'),
                "endpoint": endpoint_details.get('endpoint', {}).get('endpoint', 'N/A'),
                "ttl": endpoint_details.get('endpoint', {}).get('ttl', 'Default'),
                "custom_domain": endpoint_details.get('endpoint', {}).get('custom_domain', None),
                "created_at": endpoint_details.get('endpoint', {}).get('created_at', 'Unknown')
            }
            
            logger.info(f"✅ CDN endpoint {cdn_id} is valid")
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ CDN endpoint {cdn_id} validation failed: {str(e)}")
            return {
                "valid": False,
                "cdn_id": cdn_id,
                "error": str(e)
            }

    async def create_endpoint_for_space(self, space_name: str, region: str = "nyc3",
                                      ttl: Optional[int] = 3600) -> Dict[str, Any]:
        """
        Create a CDN endpoint for a DigitalOcean Space
        
        Args:
            space_name: Name of the DigitalOcean Space
            region: Region where the Space is located (default: nyc3)
            ttl: Time to live in seconds (default: 3600 = 1 hour)
            
        Returns:
            Dict containing created CDN endpoint details
        """
        try:
            logger.info(f"🚀 Creating CDN endpoint for Space: {space_name} in region {region}")
            
            # Construct the origin URL for the Space
            origin = f"{space_name}.{region}.digitaloceanspaces.com"
            
            return await self.create_endpoint(origin=origin, ttl=ttl)
            
        except Exception as e:
            logger.error(f"❌ Error creating CDN endpoint for Space {space_name}: {str(e)}")
            raise

    async def get_cdn_statistics(self) -> Dict[str, Any]:
        """
        Get overall CDN statistics and usage summary
        
        Returns:
            Dict containing CDN statistics
        """
        try:
            logger.info("📊 Getting overall CDN statistics")
            
            # List all endpoints to calculate statistics
            endpoints_response = await self.list_endpoints()
            endpoints = endpoints_response.get('endpoints', [])
            
            # Calculate basic statistics
            total_endpoints = len(endpoints)
            endpoints_with_custom_domains = sum(1 for ep in endpoints if ep.get('custom_domain'))
            endpoints_by_region = {}
            
            for endpoint in endpoints:
                origin = endpoint.get('origin', '')
                # Extract region from origin (e.g., "name.nyc3.digitaloceanspaces.com" -> "nyc3")
                parts = origin.split('.')
                if len(parts) >= 3 and 'digitaloceanspaces' in origin:
                    region = parts[1]
                    endpoints_by_region[region] = endpoints_by_region.get(region, 0) + 1
            
            statistics = {
                "total_endpoints": total_endpoints,
                "endpoints_with_custom_domains": endpoints_with_custom_domains,
                "endpoints_by_region": endpoints_by_region,
                "endpoints": endpoints
            }
            
            logger.info(f"✅ Retrieved CDN statistics: {total_endpoints} total endpoints")
            return statistics
            
        except Exception as e:
            logger.error(f"❌ Error getting CDN statistics: {str(e)}")
            raise

# Factory function to create CDNService with token
def get_cdn_service(token=None):
    """Get a CDNService instance with the provided token"""
    return CDNService(token=token)

# Global instance - will be initialized later with proper token
cdn_service = None
