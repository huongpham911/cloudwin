from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class WindowsTemplate(BaseModel):
    id: str
    name: str
    description: str
    min_ram_gb: int
    min_disk_gb: int
    estimated_build_time_minutes: int

class WindowsBuildRequest(BaseModel):
    name: str = Field(..., description="Name for the Windows droplet")
    template_id: str = Field(..., description="Windows template to use (win10-ltsc, tiny10, etc)")
    region: str = Field(..., description="DigitalOcean region")
    size: Optional[str] = Field(None, description="Droplet size (defaults to s-4vcpu-8gb)")
    username: str = Field(default="Administrator", description="Windows admin username")
    password: str = Field(..., min_length=8, description="Windows admin password")
    enable_rdp: bool = Field(default=True, description="Enable RDP access")
    rdp_port: int = Field(default=3389, description="RDP port")

class WindowsBuildResponse(BaseModel):
    droplet_id: int
    message: str
    status: str
    estimated_time_minutes: int

class WindowsBuildStatus(BaseModel):
    droplet_id: int
    status: str  # building, active, error
    progress_percentage: int
    current_step: str
    ip_address: Optional[str]
    rdp_port: Optional[int]
    logs: str

class WindowsAutomationScript(BaseModel):
    """Schema for custom automation scripts to run after Windows is installed"""
    name: str
    description: str
    script_type: str  # powershell, batch, python
    content: str
    run_as_admin: bool = True
    run_on_startup: bool = False
