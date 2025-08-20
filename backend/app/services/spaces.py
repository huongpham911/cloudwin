"""
DigitalOcean Spaces Service
Manages Spaces keys and buckets using PyDO SDK and boto3 for real bucket operations
Based on: https://docs.digitalocean.com/reference/pydo/reference/spaces_key/
"""

import pydo
import boto3
import os
from botocore.config import Config
from botocore.exceptions import ClientError
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class SpacesService:
    """Service for managing DigitalOcean Spaces keys and buckets using PyDO SDK and boto3"""
    
    def __init__(self, token: str = None, spaces_key: str = None, spaces_secret: str = None):
        """Initialize Spaces service with DigitalOcean token and Spaces credentials"""
        self.token = token or os.getenv('DIGITALOCEAN_TOKEN')
        if not self.token:
            raise ValueError("DigitalOcean token is required")
        
        self.client = pydo.Client(token=self.token)
        
        # For real bucket operations, we need Spaces access keys
        self.spaces_key = spaces_key
        self.spaces_secret = spaces_secret
        self.s3_client = None
        
        # Initialize S3 client if credentials are provided
        if self.spaces_key and self.spaces_secret:
            self._init_s3_client()
            
        logger.info("🔑 Spaces service initialized with S3 support")

    def _init_s3_client(self, region: str = "nyc3"):
        """Initialize boto3 S3 client for DigitalOcean Spaces"""
        try:
            session = boto3.session.Session()
            self.s3_client = session.client(
                's3',
                region_name=region,
                endpoint_url=f'https://{region}.digitaloceanspaces.com',
                aws_access_key_id=self.spaces_key,
                aws_secret_access_key=self.spaces_secret,
                config=Config(
                    signature_version='s3v4',
                    s3={
                        'addressing_style': 'virtual'
                    }
                )
            )
            logger.info(f"✅ S3 client initialized for region {region}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize S3 client: {str(e)}")
            self.s3_client = None

    async def set_spaces_credentials(self, access_key: str, secret_key: str, region: str = "nyc3"):
        """Set Spaces credentials for S3 operations"""
        self.spaces_key = access_key
        self.spaces_secret = secret_key
        self._init_s3_client(region)
        return self.s3_client is not None

    async def list_spaces_keys(self, per_page: int = 25, page: int = 1) -> Dict[str, Any]:
        """
        List all Spaces access keys
        
        Args:
            per_page: Number of items per page (default: 25)
            page: Page number (default: 1)
            
        Returns:
            Dict containing spaces keys list and metadata
        """
        try:
            logger.info(f"📋 Listing Spaces keys (page={page}, per_page={per_page})")
            
            # Try without pagination parameters first
            response = self.client.spaces_key.list()
            
            # Log the raw response to debug
            logger.info(f"🔍 Raw API response type: {type(response)}")
            logger.info(f"🔍 Raw API response: {response}")
            
            # Handle different response formats
            keys_list = []
            
            if isinstance(response, dict):
                if 'keys' in response:
                    keys_list = response['keys']
                    logger.info(f"✅ Retrieved {len(keys_list)} Spaces keys from ['keys']")
                elif 'spaces_keys' in response:
                    keys_list = response['spaces_keys']
                    logger.info(f"✅ Retrieved {len(keys_list)} Spaces keys from ['spaces_keys']")
                else:
                    logger.warning(f"⚠️ No keys field found in response: {list(response.keys())}")
            elif hasattr(response, 'keys') and not callable(response.keys):
                keys_list = response.keys
                logger.info(f"✅ Retrieved {len(keys_list)} Spaces keys from .keys")
            elif hasattr(response, 'spaces_keys'):
                keys_list = response.spaces_keys
                logger.info(f"✅ Retrieved {len(keys_list)} Spaces keys from .spaces_keys")
            else:
                logger.warning(f"⚠️ Unexpected response format: {type(response)} - {response}")
            
            # Ensure it's a list
            if not isinstance(keys_list, list):
                logger.warning(f"⚠️ keys_list is not a list: {type(keys_list)}")
                keys_list = []
            
            return {
                'spaces_keys': keys_list,
                'meta': getattr(response, 'meta', {}),
                'links': getattr(response, 'links', {})
            }
            
        except Exception as e:
            logger.error(f"❌ Error listing Spaces keys: {str(e)}")
            raise

    async def get_spaces_key(self, key_id: str) -> Dict[str, Any]:
        """
        Get details of a specific Spaces access key
        
        Args:
            key_id: The ID of the Spaces access key
            
        Returns:
            Dict containing spaces key details
        """
        try:
            logger.info(f"🔍 Getting Spaces key: {key_id}")
            
            response = self.client.spaces_key.get(key_id=key_id)
            
            logger.info(f"✅ Retrieved Spaces key: {response.get('spaces_key', {}).get('name', 'Unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error getting Spaces key {key_id}: {str(e)}")
            raise

    async def create_spaces_key(self, name: str, buckets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Create a new Spaces access key with proper permissions
        
        Args:
            name: Name for the Spaces access key
            buckets: Optional list of bucket names to restrict access to (None = All Permissions)
            
        Returns:
            Dict containing created spaces key details
        """
        try:
            logger.info(f"🆕 Creating Spaces key: {name}")
            
            body = {
                "name": name
            }
            
            # For All Permissions, we need to explicitly set grants with fullaccess permission
            if buckets is None:
                logger.info(f"🔓 Creating key with FULLACCESS permissions")
                # Explicit fullaccess grant - this should give all permissions
                body["grants"] = [
                    {
                        "permission": "fullaccess"
                    }
                ]
            else:
                logger.info(f"🪣 Creating key with bucket-specific permissions: {buckets}")
                # Create read/write grants for specific buckets
                grants = []
                for bucket in buckets:
                    grants.extend([
                        {
                            "permission": "read",
                            "bucket": bucket
                        },
                        {
                            "permission": "write", 
                            "bucket": bucket
                        }
                    ])
                body["grants"] = grants
            
            logger.info(f"📋 Request body: {body}")
            response = self.client.spaces_key.create(body=body)
            
            logger.info(f"✅ Created Spaces key: {name}")
            logger.info(f"📊 Response keys: {list(response.keys()) if isinstance(response, dict) else type(response)}")
            
            return response
            
        except Exception as e:
            logger.error(f"❌ Error creating Spaces key {name}: {str(e)}")
            raise

    async def update_spaces_key(self, key_id: str, name: Optional[str] = None, 
                               buckets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Update a Spaces access key
        
        Args:
            key_id: The ID of the Spaces access key to update
            name: New name for the key (optional)
            buckets: New list of bucket restrictions (optional)
            
        Returns:
            Dict containing updated spaces key details
        """
        try:
            logger.info(f"📝 Updating Spaces key: {key_id}")
            
            body = {}
            if name:
                body["name"] = name
            if buckets is not None:  # Allow empty list to remove restrictions
                body["buckets"] = buckets
            
            if not body:
                raise ValueError("At least one field (name or buckets) must be provided for update")
            
            response = self.client.spaces_key.update(key_id=key_id, body=body)
            
            logger.info(f"✅ Updated Spaces key: {key_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error updating Spaces key {key_id}: {str(e)}")
            raise

    async def patch_spaces_key(self, key_id: str, name: Optional[str] = None, 
                              buckets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Partially update a Spaces access key (PATCH method)
        
        Args:
            key_id: The ID of the Spaces access key to patch
            name: New name for the key (optional)
            buckets: New list of bucket restrictions (optional)
            
        Returns:
            Dict containing patched spaces key details
        """
        try:
            logger.info(f"🔧 Patching Spaces key: {key_id}")
            
            body = {}
            if name:
                body["name"] = name
            if buckets is not None:
                body["buckets"] = buckets
            
            if not body:
                raise ValueError("At least one field (name or buckets) must be provided for patch")
            
            response = self.client.spaces_key.patch(key_id=key_id, body=body)
            
            logger.info(f"✅ Patched Spaces key: {key_id}")
            return response
            
        except Exception as e:
            logger.error(f"❌ Error patching Spaces key {key_id}: {str(e)}")
            raise

    async def delete_spaces_key(self, key_id: str) -> bool:
        """
        Delete a Spaces access key
        
        Args:
            key_id: The access key ID of the Spaces access key to delete
            
        Returns:
            True if deletion was successful
        """
        try:
            logger.info(f"🗑️ Deleting Spaces key: {key_id}")
            
            self.client.spaces_key.delete(access_key=key_id)
            
            logger.info(f"✅ Deleted Spaces key: {key_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error deleting Spaces key {key_id}: {str(e)}")
            raise

    async def get_spaces_key_usage(self, key_id: str) -> Dict[str, Any]:
        """
        Get usage statistics for a Spaces access key (if available)
        Note: This may not be directly available through PyDO, but included for completeness
        
        Args:
            key_id: The ID of the Spaces access key
            
        Returns:
            Dict containing usage information
        """
        try:
            logger.info(f"📊 Getting usage for Spaces key: {key_id}")
            
            # Get the key details first
            key_details = await self.get_spaces_key(key_id)
            
            # For now, return the key details
            # In the future, this could be extended to include usage metrics
            usage_info = {
                "key_id": key_id,
                "key_details": key_details,
                "usage_metrics": {
                    "note": "Usage metrics not yet available through PyDO API"
                }
            }
            
            logger.info(f"✅ Retrieved usage info for Spaces key: {key_id}")
            return usage_info
            
        except Exception as e:
            logger.error(f"❌ Error getting usage for Spaces key {key_id}: {str(e)}")
            raise

    async def validate_spaces_key(self, key_id: str) -> Dict[str, Any]:
        """
        Validate a Spaces access key by attempting to retrieve its details
        
        Args:
            key_id: The ID of the Spaces access key to validate
            
        Returns:
            Dict containing validation results
        """
        try:
            logger.info(f"🔍 Validating Spaces key: {key_id}")
            
            key_details = await self.get_spaces_key(key_id)
            
            validation_result = {
                "valid": True,
                "key_id": key_id,
                "key_name": key_details.get('spaces_key', {}).get('name', 'Unknown'),
                "access_key": key_details.get('spaces_key', {}).get('access_key_id', 'N/A'),
                "buckets": key_details.get('spaces_key', {}).get('buckets', []),
                "created_at": key_details.get('spaces_key', {}).get('created_at', 'Unknown')
            }
            
            logger.info(f"✅ Spaces key {key_id} is valid")
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ Spaces key {key_id} validation failed: {str(e)}")
            return {
                "valid": False,
                "key_id": key_id,
                "error": str(e)
            }

    # BUCKETS MANAGEMENT
    
    async def list_buckets(self) -> Dict[str, Any]:
        """
        List all Spaces buckets using S3-compatible API
        
        Returns:
            Dict containing buckets list
        """
        try:
            logger.info("📋 Listing Spaces buckets using S3 API")
            
            if not self.s3_client:
                # Attempt to create a key first if no S3 client
                await self._ensure_s3_client()
                
            if not self.s3_client:
                return {
                    "buckets": [],
                    "error": "No Spaces access keys available. Create a Spaces key first.",
                    "need_credentials": True
                }
            
            # List buckets using boto3
            response = self.s3_client.list_buckets()
            
            buckets = []
            for bucket in response.get('Buckets', []):
                # Try to detect bucket region
                bucket_region = "nyc3"  # Default to nyc3 for DO Spaces
                try:
                    # Get bucket location
                    location_response = self.s3_client.get_bucket_location(Bucket=bucket['Name'])
                    bucket_region = location_response.get('LocationConstraint') or "nyc3"
                except Exception as e:
                    logger.warning(f"Could not detect region for bucket {bucket['Name']}: {e}")
                    bucket_region = "nyc3"  # Fallback to nyc3
                
                buckets.append({
                    "name": bucket['Name'],
                    "creation_date": bucket['CreationDate'].isoformat(),
                    "region": bucket_region
                })
            
            logger.info(f"✅ Retrieved {len(buckets)} real buckets")
            return {
                "buckets": buckets,
                "count": len(buckets)
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"❌ S3 Error listing buckets: {error_code}")
            return {
                "buckets": [],
                "error": f"S3 Error: {error_code} - {e.response['Error']['Message']}"
            }
        except Exception as e:
            logger.error(f"❌ Error listing buckets: {str(e)}")
            return {
                "buckets": [],
                "error": str(e)
            }

    async def _ensure_s3_client(self):
        """Ensure S3 client is available by finding existing key with full permissions or creating new one"""
        try:
            if self.s3_client:
                return True
                
            # Strategy 1: Try to get existing keys and look for one with full permissions
            keys_response = await self.list_spaces_keys()
            existing_keys = keys_response.get('spaces_keys', [])
            
            if existing_keys:
                logger.info(f"🔍 Found {len(existing_keys)} existing keys, checking for full permissions...")
                
                # Look for a key with no bucket restrictions (= All Permissions)
                for key in existing_keys:
                    grants = key.get('grants', [])
                    buckets = key.get('buckets', [])
                    
                    # Check if key has all permissions (no bucket restrictions)
                    if not buckets or len(buckets) == 0:
                        access_key = key.get('access_key')
                        if access_key:
                            logger.info(f"✅ Found existing key with All Permissions: {access_key}")
                            # We still need secret key, but we'll try with stored credentials
                            # This is a limitation - we can't get secret key from existing keys
                            logger.warning("⚠️ Cannot retrieve secret key for existing key, will create new one")
                            break
            
            # Strategy 2: Create a new key with All Permissions (no bucket restrictions)
            logger.info("🆕 Creating new Spaces key with ALL PERMISSIONS for S3 operations...")
            
            # Create key with no bucket restrictions = All Permissions
            new_key_response = await self.create_spaces_key(
                name="wincloud-auto-s3-full-permissions",
                buckets=None  # No bucket restrictions = All Permissions
            )
            
            logger.info(f"🔍 New key response structure: {list(new_key_response.keys())}")
            
            # Handle different response structures
            spaces_key_data = None
            if 'key' in new_key_response:
                # Direct key response (this is the actual structure)
                spaces_key_data = new_key_response['key']
            elif 'spaces_key' in new_key_response:
                spaces_key_data = new_key_response['spaces_key']
                if 'key' in spaces_key_data:
                    spaces_key_data = spaces_key_data['key']
            
            if spaces_key_data:
                # Extract credentials directly from key data
                access_key = spaces_key_data.get('access_key')
                secret_key = spaces_key_data.get('secret_key')
                
                logger.info(f"🔑 Extracted credentials: access_key={bool(access_key)}, secret_key={bool(secret_key)}")
                
                if access_key and secret_key:
                    logger.info(f"✅ Auto-created key with ALL PERMISSIONS: {access_key}")
                    await self.set_spaces_credentials(access_key, secret_key)
                    return True
                else:
                    logger.error(f"❌ New key missing credentials: access_key={bool(access_key)}, secret_key={bool(secret_key)}")
                    logger.error(f"❌ Spaces key data: {spaces_key_data}")
            else:
                logger.error(f"❌ No 'spaces_key' or 'key' in response: {list(new_key_response.keys())}")
                logger.error(f"❌ Full response: {new_key_response}")
            
            logger.warning("⚠️ Could not establish S3 credentials")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error ensuring S3 client: {str(e)}")
            return False

    async def create_bucket(self, name: str, region: str = "nyc3") -> Dict[str, Any]:
        """
        Create a new Spaces bucket
        Note: This requires S3-compatible API calls, not available in PyDO
        
        Args:
            name: Bucket name
            region: Region to create bucket in
            
        Returns:
            Dict containing created bucket details
        """
        try:
            logger.info(f"🆕 Creating REAL bucket: {name} in region {region}")
            
            if not self.s3_client:
                await self._ensure_s3_client()
                
            if not self.s3_client:
                return {
                    "error": "No Spaces access keys available. Create a Spaces key first.",
                    "need_credentials": True
                }
            
            # Create bucket using boto3
            create_bucket_config = {}
            if region != 'us-east-1':  # S3 default region
                create_bucket_config['CreateBucketConfiguration'] = {
                    'LocationConstraint': region
                }
            
            self.s3_client.create_bucket(
                Bucket=name,
                **create_bucket_config
            )
            
            response = {
                "name": name,
                "region": region,
                "creation_date": "2025-08-06T22:00:00Z",
                "status": "created",
                "message": f"Bucket {name} created successfully!",
                "real": True
            }
            
            logger.info(f"✅ REAL bucket created: {name}")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"❌ S3 Error creating bucket {name}: {error_code}")
            
            return {
                "error": f"Failed to create bucket: {error_code} - {error_msg}",
                "bucket_name": name,
                "s3_error": True
            }
        except Exception as e:
            logger.error(f"❌ Error creating bucket {name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": name
            }

    async def create_bucket_with_credentials(self, name: str, region: str, access_key: str, secret_key: str) -> Dict[str, Any]:
        """
        Create a new Spaces bucket using provided credentials
        
        Args:
            name: Bucket name
            region: Region to create bucket in
            access_key: Spaces access key
            secret_key: Spaces secret key
            
        Returns:
            Dict containing created bucket details
        """
        try:
            logger.info(f"🆕 Creating REAL bucket with provided credentials: {name} in region {region}")
            
            # Create temporary S3 client with provided credentials
            temp_s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{region}.digitaloceanspaces.com',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            
            # Create bucket using boto3
            create_bucket_config = {}
            if region != 'us-east-1':  # S3 default region
                create_bucket_config['CreateBucketConfiguration'] = {
                    'LocationConstraint': region
                }
            
            temp_s3_client.create_bucket(
                Bucket=name,
                **create_bucket_config
            )
            
            response = {
                "name": name,
                "region": region,
                "creation_date": "2025-08-06T22:00:00Z",
                "status": "created",
                "message": f"Bucket {name} created successfully with provided credentials!",
                "real": True
            }
            
            logger.info(f"✅ REAL bucket created with credentials: {name}")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"❌ S3 Error creating bucket {name} with credentials: {error_code}")
            
            return {
                "error": f"Failed to create bucket: {error_code} - {error_msg}",
                "bucket_name": name,
                "s3_error": True
            }
        except Exception as e:
            logger.error(f"❌ Error creating bucket {name} with credentials: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": name
            }

    async def create_bucket_with_acl(self, name: str, region: str = "nyc3", acl: str = "private") -> Dict[str, Any]:
        """
        Create a new Spaces bucket with specified ACL
        
        Args:
            name: Bucket name
            region: Region to create bucket in
            acl: Access control level - 'private' or 'public-read'
            
        Returns:
            Dict containing created bucket details
        """
        try:
            logger.info(f"🆕 Creating REAL bucket with ACL: {name} in region {region}, ACL: {acl}")
            
            if not self.s3_client:
                await self._ensure_s3_client()
                
            if not self.s3_client:
                return {
                    "error": "No Spaces access keys available. Create a Spaces key first.",
                    "need_credentials": True
                }
            
            # Create bucket using boto3 with ACL
            create_bucket_config = {}
            if region != 'us-east-1':  # S3 default region
                create_bucket_config['CreateBucketConfiguration'] = {
                    'LocationConstraint': region
                }
            
            # Create bucket first
            self.s3_client.create_bucket(
                Bucket=name,
                **create_bucket_config
            )
            
            # Set bucket ACL if public
            if acl == 'public-read':
                self.s3_client.put_bucket_acl(
                    Bucket=name,
                    ACL='public-read'
                )
                logger.info(f"🌐 Bucket {name} set to public-read")
            
            response = {
                "name": name,
                "region": region,
                "acl": acl,
                "visibility": "Public" if acl == "public-read" else "Private",
                "creation_date": "2025-08-08T22:00:00Z",
                "status": "created",
                "message": f"Bucket {name} created successfully with {acl} access!",
                "real": True
            }
            
            logger.info(f"✅ REAL bucket created with ACL: {name} ({acl})")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"❌ S3 Error creating bucket {name} with ACL: {error_code}")
            
            return {
                "error": f"Failed to create bucket: {error_code} - {error_msg}",
                "bucket_name": name,
                "s3_error": True
            }
        except Exception as e:
            logger.error(f"❌ Error creating bucket {name} with ACL: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": name
            }

    async def create_bucket_with_credentials_and_acl(self, name: str, region: str, access_key: str, secret_key: str, acl: str = "private") -> Dict[str, Any]:
        """
        Create a new Spaces bucket using provided credentials with specified ACL
        
        Args:
            name: Bucket name
            region: Region to create bucket in
            access_key: Spaces access key
            secret_key: Spaces secret key
            acl: Access control level - 'private' or 'public-read'
            
        Returns:
            Dict containing created bucket details
        """
        try:
            logger.info(f"🆕 Creating REAL bucket with provided credentials and ACL: {name} in region {region}, ACL: {acl}")
            
            # Create temporary S3 client with provided credentials
            temp_s3_client = boto3.client(
                's3',
                endpoint_url=f'https://{region}.digitaloceanspaces.com',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            
            # Create bucket using boto3 with ACL
            create_bucket_config = {}
            if region != 'us-east-1':  # S3 default region
                create_bucket_config['CreateBucketConfiguration'] = {
                    'LocationConstraint': region
                }
            
            # Create bucket first
            temp_s3_client.create_bucket(
                Bucket=name,
                **create_bucket_config
            )
            
            # Set bucket ACL if public
            if acl == 'public-read':
                temp_s3_client.put_bucket_acl(
                    Bucket=name,
                    ACL='public-read'
                )
                logger.info(f"🌐 Bucket {name} set to public-read")
            
            response = {
                "name": name,
                "region": region,
                "acl": acl,
                "visibility": "Public" if acl == "public-read" else "Private",
                "creation_date": "2025-08-08T22:00:00Z",
                "status": "created",
                "message": f"Bucket {name} created successfully with {acl} access using provided credentials!",
                "real": True
            }
            
            logger.info(f"✅ REAL bucket created with credentials and ACL: {name} ({acl})")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"❌ S3 Error creating bucket {name} with credentials and ACL: {error_code}")
            
            return {
                "error": f"Failed to create bucket: {error_code} - {error_msg}",
                "bucket_name": name,
                "s3_error": True
            }
        except Exception as e:
            logger.error(f"❌ Error creating bucket {name} with credentials and ACL: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": name
            }

    async def delete_bucket(self, name: str) -> Dict[str, Any]:
        """
        Delete a Spaces bucket using S3-compatible API
        
        Args:
            name: Bucket name to delete
            
        Returns:
            Dict containing deletion status
        """
        try:
            logger.info(f"🗑️ Deleting REAL bucket: {name}")
            
            if not self.s3_client:
                await self._ensure_s3_client()
                
            if not self.s3_client:
                return {
                    "error": "No Spaces access keys available. Create a Spaces key first.",
                    "need_credentials": True
                }
            
            # Delete bucket using boto3
            self.s3_client.delete_bucket(Bucket=name)
            
            response = {
                "message": f"Bucket {name} deleted successfully!",
                "bucket_name": name,
                "status": "deleted",
                "real": True
            }
            
            logger.info(f"✅ REAL bucket deleted: {name}")
            return response
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_msg = e.response['Error']['Message']
            logger.error(f"❌ S3 Error deleting bucket {name}: {error_code}")
            
            return {
                "error": f"Failed to delete bucket: {error_code} - {error_msg}",
                "bucket_name": name,
                "s3_error": True
            }
        except Exception as e:
            logger.error(f"❌ Error deleting bucket {name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": name
            }

    # ================================
    # CDN Settings for Spaces Buckets  
    # ================================
    
    async def get_bucket_cdn_status(self, bucket_name: str, region: str = "nyc3") -> Dict[str, Any]:
        """
        Get CDN status for a specific Spaces bucket
        
        Args:
            bucket_name: Name of the Spaces bucket
            region: Region of the bucket (default: nyc3)
            
        Returns:
            Dict containing CDN status and endpoint details
        """
        try:
            logger.info(f"🔍 Checking CDN status for bucket: {bucket_name}")
            
            # Import CDN service here to avoid circular imports
            from .cdn import CDNService
            cdn_service = CDNService(self.token)
            
            # List all CDN endpoints
            endpoints_response = await cdn_service.list_endpoints()
            
            # Check if there's a CDN endpoint for this bucket
            bucket_origin = f"{bucket_name}.{region}.digitaloceanspaces.com"
            cdn_endpoint = None
            
            if 'endpoints' in endpoints_response:
                for endpoint in endpoints_response['endpoints']:
                    if endpoint.get('origin') == bucket_origin:
                        cdn_endpoint = endpoint
                        break
            
            if cdn_endpoint:
                return {
                    "bucket_name": bucket_name,
                    "cdn_enabled": True,
                    "cdn_endpoint": cdn_endpoint,
                    "cdn_url": cdn_endpoint.get('endpoint', ''),
                    "origin": bucket_origin,
                    "ttl": cdn_endpoint.get('ttl', 3600),
                    "created_at": cdn_endpoint.get('created_at', ''),
                    "endpoint_id": cdn_endpoint.get('id', '')
                }
            else:
                return {
                    "bucket_name": bucket_name,
                    "cdn_enabled": False,
                    "cdn_endpoint": None,
                    "cdn_url": None,
                    "origin": bucket_origin,
                    "ttl": None,
                    "created_at": None,
                    "endpoint_id": None
                }
                
        except Exception as e:
            logger.error(f"❌ Error checking CDN status for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "cdn_enabled": False
            }

    async def enable_bucket_cdn(self, bucket_name: str, region: str = "nyc3", ttl: int = 3600, 
                               custom_domain: Optional[str] = None, certificate_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Enable CDN for a Spaces bucket by creating a CDN endpoint
        
        Args:
            bucket_name: Name of the Spaces bucket
            region: Region of the bucket (default: nyc3)
            ttl: Cache TTL in seconds (default: 3600 = 1 hour)
            custom_domain: Optional custom domain for the CDN
            certificate_id: Optional certificate ID for custom domain
            
        Returns:
            Dict containing CDN endpoint details
        """
        try:
            logger.info(f"🚀 Enabling CDN for bucket: {bucket_name}")
            
            # Check if CDN is already enabled
            cdn_status = await self.get_bucket_cdn_status(bucket_name, region)
            if cdn_status.get('cdn_enabled'):
                logger.warning(f"⚠️ CDN already enabled for bucket {bucket_name}")
                return {
                    "success": True,
                    "message": "CDN already enabled",
                    "endpoint": cdn_status.get('cdn_endpoint'),
                    "bucket_name": bucket_name
                }
            
            # Import CDN service here to avoid circular imports
            from .cdn import CDNService
            cdn_service = CDNService(self.token)
            
            # Create CDN endpoint for the bucket
            bucket_origin = f"{bucket_name}.{region}.digitaloceanspaces.com"
            
            endpoint_data = {
                "origin": bucket_origin,
                "ttl": ttl
            }
            
            # Add custom domain if provided
            if custom_domain and certificate_id:
                endpoint_data["custom_domain"] = custom_domain
                endpoint_data["certificate_id"] = certificate_id
            
            endpoint_response = await cdn_service.create_endpoint(endpoint_data)
            
            logger.info(f"✅ CDN enabled for bucket {bucket_name}")
            return {
                "success": True,
                "message": "CDN enabled successfully",
                "endpoint": endpoint_response.get('endpoint'),
                "bucket_name": bucket_name,
                "cdn_url": endpoint_response.get('endpoint', {}).get('endpoint', ''),
                "origin": bucket_origin
            }
            
        except Exception as e:
            logger.error(f"❌ Error enabling CDN for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "success": False
            }

    async def disable_bucket_cdn(self, bucket_name: str, region: str = "nyc3") -> Dict[str, Any]:
        """
        Disable CDN for a Spaces bucket by deleting the CDN endpoint
        
        Args:
            bucket_name: Name of the Spaces bucket
            region: Region of the bucket (default: nyc3)
            
        Returns:
            Dict containing operation result
        """
        try:
            logger.info(f"🛑 Disabling CDN for bucket: {bucket_name}")
            
            # Check if CDN is enabled and get endpoint ID
            cdn_status = await self.get_bucket_cdn_status(bucket_name, region)
            if not cdn_status.get('cdn_enabled'):
                logger.warning(f"⚠️ CDN not enabled for bucket {bucket_name}")
                return {
                    "success": True,
                    "message": "CDN was not enabled",
                    "bucket_name": bucket_name
                }
            
            endpoint_id = cdn_status.get('endpoint_id')
            if not endpoint_id:
                logger.error(f"❌ Cannot find CDN endpoint ID for bucket {bucket_name}")
                return {
                    "error": "CDN endpoint ID not found",
                    "bucket_name": bucket_name,
                    "success": False
                }
            
            # Import CDN service here to avoid circular imports
            from .cdn import CDNService
            cdn_service = CDNService(self.token)
            
            # Delete CDN endpoint
            delete_response = await cdn_service.delete_endpoint(endpoint_id)
            
            logger.info(f"✅ CDN disabled for bucket {bucket_name}")
            return {
                "success": True,
                "message": "CDN disabled successfully",
                "bucket_name": bucket_name,
                "endpoint_id": endpoint_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error disabling CDN for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "success": False
            }

    async def update_bucket_cdn_settings(self, bucket_name: str, region: str = "nyc3", 
                                        ttl: Optional[int] = None, custom_domain: Optional[str] = None, 
                                        certificate_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Update CDN settings for a Spaces bucket
        
        Args:
            bucket_name: Name of the Spaces bucket
            region: Region of the bucket (default: nyc3)
            ttl: New cache TTL in seconds
            custom_domain: New custom domain for the CDN
            certificate_id: Certificate ID for custom domain
            
        Returns:
            Dict containing updated CDN endpoint details
        """
        try:
            logger.info(f"⚙️ Updating CDN settings for bucket: {bucket_name}")
            
            # Check if CDN is enabled and get endpoint ID
            cdn_status = await self.get_bucket_cdn_status(bucket_name, region)
            if not cdn_status.get('cdn_enabled'):
                logger.error(f"❌ CDN not enabled for bucket {bucket_name}")
                return {
                    "error": "CDN is not enabled for this bucket",
                    "bucket_name": bucket_name,
                    "success": False
                }
            
            endpoint_id = cdn_status.get('endpoint_id')
            if not endpoint_id:
                logger.error(f"❌ Cannot find CDN endpoint ID for bucket {bucket_name}")
                return {
                    "error": "CDN endpoint ID not found",
                    "bucket_name": bucket_name,
                    "success": False
                }
            
            # Import CDN service here to avoid circular imports
            from .cdn import CDNService
            cdn_service = CDNService(self.token)
            
            # Prepare update data
            update_data = {}
            if ttl is not None:
                update_data["ttl"] = ttl
            if custom_domain is not None:
                update_data["custom_domain"] = custom_domain
            if certificate_id is not None:
                update_data["certificate_id"] = certificate_id
            
            if not update_data:
                logger.warning(f"⚠️ No update data provided for bucket {bucket_name}")
                return {
                    "success": True,
                    "message": "No changes requested",
                    "bucket_name": bucket_name
                }
            
            # Update CDN endpoint
            update_response = await cdn_service.update_endpoint(endpoint_id, update_data)
            
            logger.info(f"✅ CDN settings updated for bucket {bucket_name}")
            return {
                "success": True,
                "message": "CDN settings updated successfully",
                "endpoint": update_response.get('endpoint'),
                "bucket_name": bucket_name
            }
            
        except Exception as e:
            logger.error(f"❌ Error updating CDN settings for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "success": False
            }

    async def purge_bucket_cdn_cache(self, bucket_name: str, region: str = "nyc3", 
                                    files: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Purge CDN cache for a Spaces bucket
        
        Args:
            bucket_name: Name of the Spaces bucket
            region: Region of the bucket (default: nyc3)
            files: List of file paths to purge (default: purge all with "*")
            
        Returns:
            Dict containing purge operation result
        """
        try:
            logger.info(f"🧹 Purging CDN cache for bucket: {bucket_name}")
            
            # Check if CDN is enabled and get endpoint ID
            cdn_status = await self.get_bucket_cdn_status(bucket_name, region)
            if not cdn_status.get('cdn_enabled'):
                logger.error(f"❌ CDN not enabled for bucket {bucket_name}")
                return {
                    "error": "CDN is not enabled for this bucket",
                    "bucket_name": bucket_name,
                    "success": False
                }
            
            endpoint_id = cdn_status.get('endpoint_id')
            if not endpoint_id:
                logger.error(f"❌ Cannot find CDN endpoint ID for bucket {bucket_name}")
                return {
                    "error": "CDN endpoint ID not found",
                    "bucket_name": bucket_name,
                    "success": False
                }
            
            # Import CDN service here to avoid circular imports
            from .cdn import CDNService
            cdn_service = CDNService(self.token)
            
            # Use default wildcard if no files specified
            if not files:
                files = ["*"]
            
            # Purge CDN cache
            purge_response = await cdn_service.purge_cache(endpoint_id, files)
            
            logger.info(f"✅ CDN cache purged for bucket {bucket_name}")
            return {
                "success": True,
                "message": "CDN cache purged successfully",
                "bucket_name": bucket_name,
                "endpoint_id": endpoint_id,
                "files_purged": files
            }
            
        except Exception as e:
            logger.error(f"❌ Error purging CDN cache for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "success": False
            }

    # ========================
    # FILE MANAGEMENT FUNCTIONS
    # ========================
    
    async def list_bucket_files(self, bucket_name: str, region: str = "nyc3", prefix: str = None) -> Dict[str, Any]:
        """List files in a Spaces bucket"""
        try:
            logger.info(f"📁 Listing files in bucket: {bucket_name}")
            
            if not self.s3_client:
                # Try to get Spaces credentials from environment or tokens
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "files": [],
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # List objects in bucket
            list_params = {
                'Bucket': bucket_name
            }
            if prefix:
                list_params['Prefix'] = prefix
            
            response = self.s3_client.list_objects_v2(**list_params)
            files = []
            
            # Process objects
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        "key": obj['Key'],
                        "size": obj['Size'],
                        "last_modified": obj['LastModified'].isoformat(),
                        "etag": obj['ETag'].strip('"'),
                        "storage_class": obj.get('StorageClass', 'STANDARD'),
                        "is_folder": obj['Key'].endswith('/')
                    })
            
            # Process common prefixes (folders)
            if 'CommonPrefixes' in response:
                for prefix_obj in response['CommonPrefixes']:
                    files.append({
                        "key": prefix_obj['Prefix'],
                        "size": 0,
                        "last_modified": "",
                        "etag": "",
                        "storage_class": "",
                        "is_folder": True
                    })
            
            logger.info(f"✅ Retrieved {len(files)} files from bucket {bucket_name}")
            return {
                "files": files,
                "bucket_name": bucket_name,
                "total_files": len(files)
            }
            
        except Exception as e:
            logger.error(f"❌ Error listing files in bucket {bucket_name}: {str(e)}")
            return {
                "files": [],
                "error": str(e),
                "bucket_name": bucket_name
            }
    
    async def upload_file_to_bucket(self, bucket_name: str, region: str, key: str, file_content: bytes, content_type: str = None, acl: str = "private") -> Dict[str, Any]:
        """Upload a file to a Spaces bucket"""
        try:
            logger.info(f"⬆️ Uploading file to bucket: {bucket_name}/{key}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name,
                    "details": "Please configure Spaces access key and secret in Settings"
                }
            
            # Validate input parameters
            if not bucket_name or not key or not file_content:
                return {
                    "error": "Missing required parameters",
                    "bucket_name": bucket_name,
                    "details": "bucket_name, key, and file_content are required"
                }
            
            # Upload parameters
            upload_params = {
                'Bucket': bucket_name,
                'Key': key,
                'Body': file_content,
                'ACL': acl
            }
            
            if content_type:
                upload_params['ContentType'] = content_type
            
            logger.info(f"📤 Upload params: Bucket={bucket_name}, Key={key}, Size={len(file_content)}, ACL={acl}, ContentType={content_type}")
            
            # Upload file
            response = self.s3_client.put_object(**upload_params)
            
            logger.info(f"✅ File uploaded successfully: {bucket_name}/{key}")
            return {
                "success": True,
                "message": "File uploaded successfully",
                "bucket_name": bucket_name,
                "key": key,
                "size": len(file_content),
                "content_type": content_type,
                "acl": acl,
                "etag": response.get('ETag', '').strip('"') if response else None
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ Error uploading file to bucket {bucket_name}: {error_msg}")
            
            # Provide more specific error messages
            if "NoSuchBucket" in error_msg:
                error_msg = f"Bucket '{bucket_name}' does not exist"
            elif "AccessDenied" in error_msg:
                error_msg = "Access denied - check Spaces credentials and bucket permissions"
            elif "InvalidAccessKeyId" in error_msg:
                error_msg = "Invalid Spaces access key"
            elif "SignatureDoesNotMatch" in error_msg:
                error_msg = "Invalid Spaces secret key"
            
            return {
                "error": error_msg,
                "bucket_name": bucket_name,
                "key": key
            }
    
    async def upload_file_streaming(self, bucket_name: str, region: str, key: str, file_stream, content_type: str = None, acl: str = "private") -> Dict[str, Any]:
        """Upload a file to a Spaces bucket using streaming (memory efficient for large files)"""
        try:
            logger.info(f"🌊 [STREAMING] Uploading file to bucket: {bucket_name}/{key}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name,
                    "details": "Please configure Spaces access key and secret in Settings"
                }
            
            # Validate input parameters
            if not bucket_name or not key or not file_stream:
                return {
                    "error": "Missing required parameters",
                    "bucket_name": bucket_name,
                    "details": "bucket_name, key, and file_stream are required"
                }
            
            # Upload parameters for streaming
            upload_params = {
                'Bucket': bucket_name,
                'Key': key,
                'Body': file_stream,  # Stream object instead of bytes
                'ACL': acl
            }
            
            if content_type:
                upload_params['ContentType'] = content_type
            
            logger.info(f"📤 [STREAMING] Upload params: Bucket={bucket_name}, Key={key}, ACL={acl}, ContentType={content_type}")
            
            # Upload file using streaming
            response = self.s3_client.put_object(**upload_params)
            
            logger.info(f"✅ [STREAMING] File uploaded successfully: {bucket_name}/{key}")
            return {
                "success": True,
                "message": "File uploaded successfully via streaming",
                "bucket_name": bucket_name,
                "key": key,
                "content_type": content_type,
                "acl": acl,
                "etag": response.get('ETag', '').strip('"') if response else None
            }
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ [STREAMING] Error uploading file to bucket {bucket_name}: {error_msg}")
            
            # Provide more specific error messages
            if "NoSuchBucket" in error_msg:
                error_msg = f"Bucket '{bucket_name}' does not exist"
            elif "AccessDenied" in error_msg:
                error_msg = "Access denied - check Spaces credentials and bucket permissions"
            elif "InvalidAccessKeyId" in error_msg:
                error_msg = "Invalid Spaces access key"
            elif "SignatureDoesNotMatch" in error_msg:
                error_msg = "Invalid Spaces secret key"
            
            return {
                "error": error_msg,
                "bucket_name": bucket_name,
                "key": key
            }
    
    async def create_folder_in_bucket(self, bucket_name: str, region: str, folder_name: str, path: str = "") -> Dict[str, Any]:
        """Create a folder in a Spaces bucket"""
        try:
            logger.info(f"📁 Creating folder in bucket: {bucket_name}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Construct folder key
            if path:
                folder_key = f"{path.rstrip('/')}/{folder_name}/"
            else:
                folder_key = f"{folder_name}/"
            
            # Create folder by putting an empty object with trailing slash
            self.s3_client.put_object(
                Bucket=bucket_name,
                Key=folder_key,
                Body=b'',
                ACL='private'
            )
            
            logger.info(f"✅ Folder created successfully: {bucket_name}/{folder_key}")
            return {
                "success": True,
                "message": "Folder created successfully",
                "bucket_name": bucket_name,
                "folder_key": folder_key
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating folder in bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "folder_name": folder_name
            }
    
    async def delete_file_from_bucket(self, bucket_name: str, region: str, key: str) -> Dict[str, Any]:
        """Delete a file from a Spaces bucket"""
        try:
            logger.info(f"🗑️ Deleting file from bucket: {bucket_name}/{key}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Delete object
            self.s3_client.delete_object(
                Bucket=bucket_name,
                Key=key
            )
            
            logger.info(f"✅ File deleted successfully: {bucket_name}/{key}")
            return {
                "success": True,
                "message": "File deleted successfully",
                "bucket_name": bucket_name,
                "key": key
            }
            
        except Exception as e:
            logger.error(f"❌ Error deleting file from bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "key": key
            }
    
    async def get_file_url(self, bucket_name: str, region: str, key: str, expires_in: int = 3600) -> Dict[str, Any]:
        """Get a presigned URL for a file in a Spaces bucket"""
        try:
            logger.info(f"🔗 Getting URL for file: {bucket_name}/{key}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Generate presigned URL
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': key},
                ExpiresIn=expires_in
            )
            
            logger.info(f"✅ Generated URL for file: {bucket_name}/{key}")
            return {
                "url": url,
                "bucket_name": bucket_name,
                "key": key,
                "expires_in": expires_in
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting URL for file {bucket_name}/{key}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name,
                "key": key
            }
    
    async def _ensure_s3_client(self, region: str = "nyc3"):
        """Ensure S3 client is initialized, try to get credentials if needed"""
        if self.s3_client:
            return
        
        try:
            logger.info(f"🔧 Initializing S3 client for region: {region}")
            
            # Check if we already have credentials
            if self.spaces_key and self.spaces_secret:
                self._init_s3_client(region)
                logger.info("✅ S3 client initialized with existing credentials")
                return
            
            # Try environment variables
            access_key = os.getenv('DO_SPACES_KEY')
            secret_key = os.getenv('DO_SPACES_SECRET')
            
            if access_key and secret_key:
                self.spaces_key = access_key
                self.spaces_secret = secret_key
                self._init_s3_client(region)
                logger.info("✅ S3 client initialized from environment variables")
                return
            
            # Try to get from first available Spaces key via API
            try:
                keys_result = await self.list_spaces_keys()
                if keys_result.get('spaces_keys'):
                    first_key = keys_result['spaces_keys'][0]
                    # Note: We can't get the secret key from API, it's only shown once during creation
                    logger.warning("⚠️ Spaces keys found but secret not available from API")
                    logger.warning("⚠️ Please configure Spaces credentials manually in Settings")
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch Spaces keys: {e}")
            
            logger.error("❌ No valid Spaces credentials found")
            
        except Exception as e:
            logger.error(f"❌ Could not initialize S3 client: {str(e)}")
    
    async def get_bucket_cors(self, bucket_name: str, region: str = "nyc3") -> Dict[str, Any]:
        """
        Get CORS configuration for a Spaces bucket
        
        Args:
            bucket_name: Name of the bucket
            region: DigitalOcean region (default: nyc3)
            
        Returns:
            Dict containing CORS configuration or error
        """
        try:
            logger.info(f"🔍 Getting CORS configuration for bucket: {bucket_name}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Get CORS configuration
            response = self.s3_client.get_bucket_cors(Bucket=bucket_name)
            
            logger.info(f"✅ Retrieved CORS configuration for bucket: {bucket_name}")
            return {
                "bucket_name": bucket_name,
                "cors_rules": response.get('CORSRules', [])
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchCORSConfiguration':
                logger.info(f"📭 No CORS configuration found for bucket: {bucket_name}")
                return {
                    "bucket_name": bucket_name,
                    "cors_rules": []
                }
            else:
                logger.error(f"❌ Error getting CORS for bucket {bucket_name}: {str(e)}")
                return {
                    "error": str(e),
                    "bucket_name": bucket_name
                }
        except Exception as e:
            logger.error(f"❌ Error getting CORS for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name
            }
    
    async def set_bucket_cors(self, bucket_name: str, cors_rules: List[Dict], region: str = "nyc3") -> Dict[str, Any]:
        """
        Set CORS configuration for a Spaces bucket
        
        Args:
            bucket_name: Name of the bucket
            cors_rules: List of CORS rules
            region: DigitalOcean region (default: nyc3)
            
        Returns:
            Dict containing success status or error
        """
        try:
            logger.info(f"🔧 Setting CORS configuration for bucket: {bucket_name}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Validate CORS rules format
            if not isinstance(cors_rules, list):
                return {
                    "error": "CORS rules must be a list",
                    "bucket_name": bucket_name
                }
            
            # Set CORS configuration
            cors_configuration = {
                'CORSRules': cors_rules
            }
            
            self.s3_client.put_bucket_cors(
                Bucket=bucket_name,
                CORSConfiguration=cors_configuration
            )
            
            logger.info(f"✅ CORS configuration set for bucket: {bucket_name}")
            return {
                "bucket_name": bucket_name,
                "message": "CORS configuration updated successfully",
                "cors_rules": cors_rules
            }
            
        except Exception as e:
            logger.error(f"❌ Error setting CORS for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name
            }
    
    async def delete_bucket_cors(self, bucket_name: str, region: str = "nyc3") -> Dict[str, Any]:
        """
        Delete CORS configuration for a Spaces bucket
        
        Args:
            bucket_name: Name of the bucket
            region: DigitalOcean region (default: nyc3)
            
        Returns:
            Dict containing success status or error
        """
        try:
            logger.info(f"🗑️ Deleting CORS configuration for bucket: {bucket_name}")
            
            if not self.s3_client:
                await self._ensure_s3_client(region)
            
            if not self.s3_client:
                return {
                    "error": "S3 client not initialized - Spaces credentials required",
                    "bucket_name": bucket_name
                }
            
            # Delete CORS configuration
            self.s3_client.delete_bucket_cors(Bucket=bucket_name)
            
            logger.info(f"✅ CORS configuration deleted for bucket: {bucket_name}")
            return {
                "bucket_name": bucket_name,
                "message": "CORS configuration deleted successfully"
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchCORSConfiguration':
                logger.info(f"📭 No CORS configuration to delete for bucket: {bucket_name}")
                return {
                    "bucket_name": bucket_name,
                    "message": "No CORS configuration found to delete"
                }
            else:
                logger.error(f"❌ Error deleting CORS for bucket {bucket_name}: {str(e)}")
                return {
                    "error": str(e),
                    "bucket_name": bucket_name
                }
        except Exception as e:
            logger.error(f"❌ Error deleting CORS for bucket {bucket_name}: {str(e)}")
            return {
                "error": str(e),
                "bucket_name": bucket_name
            }

# Factory function to create SpacesService with token
def get_spaces_service(token=None):
    """Get a SpacesService instance with the provided token"""
    return SpacesService(token=token)

# Global instance - will be initialized later with proper token
spaces_service = None
