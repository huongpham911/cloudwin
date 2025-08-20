"""
Pydantic schemas for Spaces API
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SpacesKeyBase(BaseModel):
    """Base schema for Spaces Key"""
    name: str = Field(..., description="Name of the Spaces access key")
    buckets: Optional[List[str]] = Field(None, description="List of bucket names to restrict access to")

class SpacesKeyCreate(SpacesKeyBase):
    """Schema for creating a new Spaces Key"""
    pass

class SpacesKeyUpdate(BaseModel):
    """Schema for updating a Spaces Key"""
    name: Optional[str] = Field(None, description="New name for the Spaces access key")
    buckets: Optional[List[str]] = Field(None, description="New list of bucket restrictions")

class SpacesKeyPatch(BaseModel):
    """Schema for partially updating a Spaces Key"""
    name: Optional[str] = Field(None, description="New name for the Spaces access key")
    buckets: Optional[List[str]] = Field(None, description="New list of bucket restrictions")

class SpacesKeyResponse(BaseModel):
    """Schema for Spaces Key response"""
    id: str = Field(..., description="Unique identifier for the Spaces access key")
    name: str = Field(..., description="Name of the Spaces access key")
    access_key_id: str = Field(..., description="Access key ID for Spaces")
    secret_access_key: Optional[str] = Field(None, description="Secret access key (only returned on creation)")
    buckets: Optional[List[str]] = Field(None, description="List of restricted buckets")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

class SpacesKeyListResponse(BaseModel):
    """Schema for Spaces Keys list response"""
    spaces_keys: List[SpacesKeyResponse] = Field(..., description="List of Spaces access keys")
    links: Optional[Dict[str, Any]] = Field(None, description="Pagination links")
    meta: Optional[Dict[str, Any]] = Field(None, description="Metadata about the response")

class SpacesKeyUsageResponse(BaseModel):
    """Schema for Spaces Key usage response"""
    key_id: str = Field(..., description="Spaces key ID")
    key_details: Dict[str, Any] = Field(..., description="Key details")
    usage_metrics: Dict[str, Any] = Field(..., description="Usage metrics")

class SpacesKeyValidationResponse(BaseModel):
    """Schema for Spaces Key validation response"""
    valid: bool = Field(..., description="Whether the key is valid")
    key_id: str = Field(..., description="Spaces key ID")
    key_name: Optional[str] = Field(None, description="Key name if valid")
    access_key: Optional[str] = Field(None, description="Access key ID if valid")
    buckets: Optional[List[str]] = Field(None, description="Restricted buckets if any")
    created_at: Optional[str] = Field(None, description="Creation timestamp if valid")
    error: Optional[str] = Field(None, description="Error message if invalid")

class SpacesKeyDeleteResponse(BaseModel):
    """Schema for Spaces Key deletion response"""
    success: bool = Field(..., description="Whether deletion was successful")
    key_id: str = Field(..., description="ID of the deleted key")
    message: str = Field(..., description="Status message")
