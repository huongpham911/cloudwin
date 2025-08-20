from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TemplateType(str, Enum):
    WINDOWS_10 = "windows-10"
    WINDOWS_11 = "windows-11"
    WINDOWS_SERVER = "windows-server"
    CUSTOM = "custom"

class WindowsTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    template_type: TemplateType
    iso_url: Optional[str] = Field(None, description="URL to Windows ISO")
    disk_size: str = Field(..., description="Disk size (e.g., '64G')")
    ram: int = Field(..., ge=2048, le=32768, description="RAM in MB")
    cpu_cores: int = Field(default=2, ge=1, le=8)
    is_public: bool = Field(default=False)
    requirements: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @validator('disk_size')
    def validate_disk_size(cls, v):
        if not v.endswith(('G', 'GB', 'T', 'TB')):
            raise ValueError('Disk size must end with G, GB, T, or TB')
        return v

class WindowsTemplateCreate(WindowsTemplateBase):
    pass

class WindowsTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    requirements: Optional[Dict[str, Any]] = None

class WindowsTemplateResponse(WindowsTemplateBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    is_active: bool
    usage_count: int = 0
    
    class Config:
        from_attributes = True

class CustomISOBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class CustomISOCreate(CustomISOBase):
    pass

class CustomISOResponse(CustomISOBase):
    id: int
    filename: str
    file_size: int
    checksum: str
    is_verified: bool
    uploaded_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True

class TemplateUsageStats(BaseModel):
    template_id: int
    template_name: str
    usage_count: int
    success_rate: float
    avg_build_time: Optional[float]
    last_used: Optional[datetime]