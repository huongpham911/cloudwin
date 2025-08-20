from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID


class DropletBase(BaseModel):
    """Base schema for Droplet"""
    name: str = Field(..., min_length=1, max_length=255, description="Droplet name")
    region: str = Field(..., description="Region slug (e.g., nyc3, sfo3)")
    size: str = Field(..., description="Size slug (e.g., s-2vcpu-4gb)")
    image: Optional[str] = Field(default="win-server-2022", description="Image slug for droplet creation")
    rdp_username: Optional[str] = Field(None, description="RDP username")
    rdp_password: Optional[str] = Field(None, description="RDP password")


class DropletCreate(DropletBase):
    """Schema for creating a new Droplet"""
    pass


class DropletUpdate(BaseModel):
    """Schema for updating a Droplet"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    rdp_username: Optional[str] = None
    rdp_password: Optional[str] = None


class DropletInDBBase(DropletBase):
    """Base schema for Droplet in database"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    do_droplet_id: Optional[int] = None
    status: str
    build_progress: int
    rdp_ip: Optional[str] = None
    rdp_port: int
    build_log: Optional[str] = None
    error_message: Optional[str] = None
    hourly_cost: Optional[str] = None
    monthly_cost: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class Droplet(DropletInDBBase):
    """Schema for Droplet response"""
    pass


class DropletList(BaseModel):
    """Schema for list of Droplets"""
    droplets: List[Droplet]
    total: int
    page: int = 1
    size: int = 20


class DropletStatus(BaseModel):
    """Schema for Droplet status response"""
    id: UUID
    status: str
    build_progress: int
    build_log: Optional[str] = None
    error_message: Optional[str] = None
    rdp_ip: Optional[str] = None
    rdp_port: Optional[int] = None
    rdp_username: Optional[str] = None


class RegionBase(BaseModel):
    """Base schema for Region"""
    slug: str
    name: str
    available: bool = True
    features: Optional[List[str]] = None


class Region(RegionBase):
    """Schema for Region response"""
    model_config = ConfigDict(from_attributes=True)


class SizeBase(BaseModel):
    """Base schema for Size"""
    slug: str
    memory: int  # MB
    vcpus: int
    disk: int  # GB
    transfer: int  # TB
    price_monthly: str
    price_hourly: str
    available: bool = True
    description: Optional[str] = None


class Size(SizeBase):
    """Schema for Size response"""
    model_config = ConfigDict(from_attributes=True)
    regions: Optional[List[str]] = None


class DropletAction(BaseModel):
    """Schema for Droplet actions"""
    action: str = Field(..., description="Action to perform: restart, stop, start")


class DropletActionResponse(BaseModel):
    """Schema for Droplet action response"""
    success: bool
    message: str
    droplet_id: UUID


class BuildProgressWebhook(BaseModel):
    """Schema for build progress webhook data"""
    progress: int = Field(..., ge=0, le=100, description="Build progress percentage")
    status: str = Field(..., description="Build status: preparing, downloading, building, installing, configuring, ready, error")
    message: Optional[str] = Field(None, description="Progress message")
    timestamp: Optional[str] = Field(None, description="Timestamp of the update")
