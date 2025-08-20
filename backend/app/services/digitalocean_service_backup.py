"""
DigitalOcean Service using PyDo SDK

This service provides a Python interface to DigitalOcean API endpoints
using the official PyDo library.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pydo import Client
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


class DigitalOceanService:
    """Service class for DigitalOcean API interactions using PyDo SDK"""
    
    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize DigitalOcean service
        
        Args:
            api_token: DigitalOcean API token. If None, will try to get from environment
        """
        # Initialize account management
        self.accounts = {}
        self.current_account = None
        
        # Use token directly from parameter or environment
        token = api_token or os.getenv("DIGITALOCEAN_TOKEN")
        if token:
            logger.info(f"✅ Using token: {token[:20]}...")
            try:
                self.client = Client(token=token)
                self.current_account = "User Token"
                logger.info("✅ DigitalOcean client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize DigitalOcean client: {e}")
                self.client = None
                self.current_account = None
        else:
            logger.warning("⚠️ No DigitalOcean API token provided. Service will return errors for API calls.")
            self.client = None
            self.current_account = None
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_regions(self) -> Dict[str, Any]:
        """Get all available regions from DigitalOcean"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Fetching regions from DigitalOcean API using account: {self.current_account}")
            response = self.client.regions.list()
            
            # Convert PyDo objects to dictionaries
            regions = []
            region_list = response.get('regions', []) if isinstance(response, dict) else response.regions
            for region in region_list:
                # Handle both dict and object formats
                if isinstance(region, dict):
                    region_dict = {
                        'name': region.get('name', 'Unknown'),
                        'slug': region.get('slug', 'unknown'),
                        'sizes': region.get('sizes', []),
                        'features': region.get('features', []),
                        'available': region.get('available', True)
                    }
                else:
                    region_dict = {
                        'name': region.name if hasattr(region, 'name') else 'Unknown',
                        'slug': region.slug if hasattr(region, 'slug') else 'unknown',
                        'sizes': region.sizes if hasattr(region, 'sizes') else [],
                        'features': region.features if hasattr(region, 'features') else [],
                        'available': region.available if hasattr(region, 'available') else True
                    }
                regions.append(region_dict)
            
            logger.info(f"✅ SUCCESS! Fetched {len(regions)} real regions from DigitalOcean")
            return {
                "regions": regions,
                "links": {},
                "meta": {"total": len(regions)}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error: {e}")
            raise Exception(f"Failed to fetch regions from DigitalOcean: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_sizes(self) -> Dict[str, Any]:
        """Get all available droplet sizes from DigitalOcean"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Fetching sizes from DigitalOcean API using account: {self.current_account}")
            response = self.client.sizes.list()
            
            # Convert PyDo objects to dictionaries
            sizes = []
            size_list = response.get('sizes', []) if isinstance(response, dict) else response.sizes
            for size in size_list:
                if isinstance(size, dict):
                    size_dict = {
                        'slug': size.get('slug', 'unknown'),
                        'memory': size.get('memory', 0),
                        'vcpus': size.get('vcpus', 1),
                        'disk': size.get('disk', 0),
                        'transfer': size.get('transfer', 0),
                        'price_monthly': size.get('price_monthly', 0),
                        'price_hourly': size.get('price_hourly', 0),
                        'regions': size.get('regions', []),
                        'available': size.get('available', True),
                        'description': f"{size.get('vcpus', 1)} vCPU, {size.get('memory', 0)//1024}GB RAM, {size.get('disk', 0)}GB SSD"
                    }
                else:
                    size_dict = {
                        'slug': size.slug if hasattr(size, 'slug') else 'unknown',
                        'memory': size.memory if hasattr(size, 'memory') else 0,
                        'vcpus': size.vcpus if hasattr(size, 'vcpus') else 1,
                        'disk': size.disk if hasattr(size, 'disk') else 0,
                        'transfer': size.transfer if hasattr(size, 'transfer') else 0,
                        'price_monthly': size.price_monthly if hasattr(size, 'price_monthly') else 0,
                        'price_hourly': size.price_hourly if hasattr(size, 'price_hourly') else 0,
                        'regions': size.regions if hasattr(size, 'regions') else [],
                        'available': size.available if hasattr(size, 'available') else True,
                        'description': f"{getattr(size, 'vcpus', 1)} vCPU, {getattr(size, 'memory', 0)//1024}GB RAM, {getattr(size, 'disk', 0)}GB SSD"
                    }
                sizes.append(size_dict)
            
            logger.info(f"✅ SUCCESS! Fetched {len(sizes)} sizes from DigitalOcean")
            return {
                "sizes": sizes,
                "links": {},
                "meta": {"total": len(sizes)}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error: {e}")
            raise Exception(f"Failed to fetch sizes from DigitalOcean: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_images(self) -> Dict[str, Any]:
        """Get all available images from DigitalOcean"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Fetching images from DigitalOcean API using account: {self.current_account}")
            response = self.client.images.list()
            
            # Convert PyDo objects to dictionaries
            images = []
            image_list = response.get('images', []) if isinstance(response, dict) else response.images
            for image in image_list:
                if isinstance(image, dict):
                    image_dict = {
                        'id': image.get('id', 0),
                        'name': image.get('name', 'Unknown'),
                        'distribution': image.get('distribution', 'Unknown'),
                        'slug': image.get('slug', None),
                        'public': image.get('public', False),
                        'regions': image.get('regions', []),
                        'created_at': image.get('created_at', ''),
                        'status': image.get('status', 'unknown'),
                        'type': image.get('type', 'unknown'),
                        'size_gigabytes': image.get('size_gigabytes', 0),
                        'description': image.get('description', '')
                    }
                else:
                    image_dict = {
                        'id': image.id if hasattr(image, 'id') else 0,
                        'name': image.name if hasattr(image, 'name') else 'Unknown',
                        'distribution': image.distribution if hasattr(image, 'distribution') else 'Unknown',
                        'slug': image.slug if hasattr(image, 'slug') else None,
                        'public': image.public if hasattr(image, 'public') else False,
                        'regions': image.regions if hasattr(image, 'regions') else [],
                        'created_at': image.created_at if hasattr(image, 'created_at') else '',
                        'status': image.status if hasattr(image, 'status') else 'unknown',
                        'type': image.type if hasattr(image, 'type') else 'unknown',
                        'size_gigabytes': image.size_gigabytes if hasattr(image, 'size_gigabytes') else 0,
                        'description': image.description if hasattr(image, 'description') else ''
                    }
                images.append(image_dict)
            
            logger.info(f"✅ SUCCESS! Fetched {len(images)} images from DigitalOcean")
            return {
                "images": images,
                "links": {},
                "meta": {"total": len(images)}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error: {e}")
            raise Exception(f"Failed to fetch images from DigitalOcean: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_droplets(self) -> Dict[str, Any]:
        """Get all droplets from DigitalOcean"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Fetching droplets from DigitalOcean API using account: {self.current_account}")
            response = self.client.droplets.list()
            
            # Convert PyDo objects to dictionaries
            droplets = []
            droplet_list = response.get('droplets', []) if isinstance(response, dict) else response.droplets
            for droplet in droplet_list:
                if isinstance(droplet, dict):
                    droplet_dict = {
                        'id': droplet.get('id', 0),
                        'name': droplet.get('name', 'Unknown'),
                        'memory': droplet.get('memory', 0),
                        'vcpus': droplet.get('vcpus', 1),
                        'disk': droplet.get('disk', 0),
                        'locked': droplet.get('locked', False),
                        'status': droplet.get('status', 'unknown'),
                        'kernel': droplet.get('kernel', {}),
                        'created_at': droplet.get('created_at', ''),
                        'features': droplet.get('features', []),
                        'backup_ids': droplet.get('backup_ids', []),
                        'snapshot_ids': droplet.get('snapshot_ids', []),
                        'image': droplet.get('image', {}),
                        'size': droplet.get('size', {}),
                        'size_slug': droplet.get('size_slug', 'unknown'),
                        'networks': droplet.get('networks', {}),
                        'region': droplet.get('region', {}),
                        'tags': droplet.get('tags', []),
                        'volume_ids': droplet.get('volume_ids', []),
                        'vpc_uuid': droplet.get('vpc_uuid', None)
                    }
                else:
                    droplet_dict = {
                        'id': droplet.id if hasattr(droplet, 'id') else 0,
                        'name': droplet.name if hasattr(droplet, 'name') else 'Unknown',
                        'memory': droplet.memory if hasattr(droplet, 'memory') else 0,
                        'vcpus': droplet.vcpus if hasattr(droplet, 'vcpus') else 1,
                        'disk': droplet.disk if hasattr(droplet, 'disk') else 0,
                        'locked': droplet.locked if hasattr(droplet, 'locked') else False,
                        'status': droplet.status if hasattr(droplet, 'status') else 'unknown',
                        'kernel': droplet.kernel if hasattr(droplet, 'kernel') else {},
                        'created_at': droplet.created_at if hasattr(droplet, 'created_at') else '',
                        'features': droplet.features if hasattr(droplet, 'features') else [],
                        'backup_ids': droplet.backup_ids if hasattr(droplet, 'backup_ids') else [],
                        'snapshot_ids': droplet.snapshot_ids if hasattr(droplet, 'snapshot_ids') else [],
                        'image': droplet.image if hasattr(droplet, 'image') else {},
                        'size': droplet.size if hasattr(droplet, 'size') else {},
                        'size_slug': droplet.size_slug if hasattr(droplet, 'size_slug') else 'unknown',
                        'networks': droplet.networks if hasattr(droplet, 'networks') else {},
                        'region': droplet.region if hasattr(droplet, 'region') else {},
                        'tags': droplet.tags if hasattr(droplet, 'tags') else [],
                        'volume_ids': droplet.volume_ids if hasattr(droplet, 'volume_ids') else [],
                        'vpc_uuid': droplet.vpc_uuid if hasattr(droplet, 'vpc_uuid') else None
                    }
                droplets.append(droplet_dict)
            
            logger.info(f"✅ SUCCESS! Fetched {len(droplets)} droplets from DigitalOcean")
            return {
                "droplets": droplets,
                "links": {},
                "meta": {"total": len(droplets)}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error: {e}")
            raise Exception(f"Failed to fetch droplets from DigitalOcean: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def get_account(self) -> Dict[str, Any]:
        """Get account information from DigitalOcean"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Fetching account info from DigitalOcean API using account: {self.current_account}")
            response = self.client.account.get()
            
            # Convert PyDo object to dictionary
            if isinstance(response, dict):
                account_dict = response.get('account', {})
            else:
                account = response.account if hasattr(response, 'account') else response
                account_dict = {
                    'droplet_limit': account.droplet_limit if hasattr(account, 'droplet_limit') else 0,
                    'floating_ip_limit': account.floating_ip_limit if hasattr(account, 'floating_ip_limit') else 0,
                    'email': account.email if hasattr(account, 'email') else '',
                    'uuid': account.uuid if hasattr(account, 'uuid') else '',
                    'email_verified': account.email_verified if hasattr(account, 'email_verified') else False,
                    'status': account.status if hasattr(account, 'status') else 'unknown',
                    'status_message': account.status_message if hasattr(account, 'status_message') else ''
                }
            
            logger.info(f"✅ SUCCESS! Fetched account info from DigitalOcean")
            return {
                "account": account_dict,
                "links": {},
                "meta": {}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error: {e}")
            raise Exception(f"Failed to fetch account info from DigitalOcean: {e}")

    def delete_droplet(self, droplet_id: int) -> Dict[str, Any]:
        """Delete a droplet by ID"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Deleting droplet {droplet_id} from DigitalOcean API")
            response = self.client.droplets.destroy(droplet_id)
            
            logger.info(f"✅ SUCCESS! Deleted droplet {droplet_id} from DigitalOcean")
            return {
                "message": f"Droplet {droplet_id} deleted successfully",
                "droplet_id": droplet_id
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error deleting droplet {droplet_id}: {e}")
            raise Exception(f"Failed to delete droplet {droplet_id} from DigitalOcean: {e}")

    def create_droplet(self, droplet_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new droplet"""
        if not self.client:
            raise Exception("DigitalOcean API client not available. Please check your API token.")
        
        try:
            logger.info(f"🔄 Creating droplet from DigitalOcean API")
            
            # Prepare droplet creation parameters
            create_params = {
                "name": droplet_config.get("name", "wincloud-droplet"),
                "region": droplet_config.get("region", "nyc1"),
                "size": droplet_config.get("size", "s-1vcpu-1gb"),
                "image": droplet_config.get("image", "ubuntu-20-04-x64"),
                "ssh_keys": droplet_config.get("ssh_keys", []),
                "backups": droplet_config.get("backups", False),
                "ipv6": droplet_config.get("ipv6", False),
                "user_data": droplet_config.get("user_data", None),
                "private_networking": droplet_config.get("private_networking", False),
                "volumes": droplet_config.get("volumes", None),
                "tags": droplet_config.get("tags", [])
            }
            
            response = self.client.droplets.create(**create_params)
            
            # Convert response to dictionary
            if isinstance(response, dict):
                droplet_dict = response.get('droplet', {})
                action_dict = response.get('action', {})
            else:
                droplet = response.droplet if hasattr(response, 'droplet') else {}
                action = response.action if hasattr(response, 'action') else {}
                
                droplet_dict = {
                    'id': droplet.id if hasattr(droplet, 'id') else 0,
                    'name': droplet.name if hasattr(droplet, 'name') else 'Unknown',
                    'status': droplet.status if hasattr(droplet, 'status') else 'unknown',
                    'created_at': droplet.created_at if hasattr(droplet, 'created_at') else '',
                    'region': droplet.region if hasattr(droplet, 'region') else {},
                    'size': droplet.size if hasattr(droplet, 'size') else {},
                    'image': droplet.image if hasattr(droplet, 'image') else {},
                    'networks': droplet.networks if hasattr(droplet, 'networks') else {}
                }
                
                action_dict = {
                    'id': action.id if hasattr(action, 'id') else 0,
                    'status': action.status if hasattr(action, 'status') else 'unknown',
                    'type': action.type if hasattr(action, 'type') else 'unknown',
                    'started_at': action.started_at if hasattr(action, 'started_at') else '',
                    'completed_at': action.completed_at if hasattr(action, 'completed_at') else None,
                    'resource_id': action.resource_id if hasattr(action, 'resource_id') else 0,
                    'resource_type': action.resource_type if hasattr(action, 'resource_type') else 'unknown'
                }
            
            logger.info(f"✅ SUCCESS! Created droplet {droplet_dict.get('id', 'unknown')} from DigitalOcean")
            return {
                "droplet": droplet_dict,
                "action": action_dict,
                "links": {},
                "meta": {}
            }
            
        except Exception as e:
            logger.error(f"❌ DigitalOcean API Error creating droplet: {e}")
            raise Exception(f"Failed to create droplet from DigitalOcean: {e}")
