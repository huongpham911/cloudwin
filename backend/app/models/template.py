from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class WindowsTemplate(Base):
    __tablename__ = "windows_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    template_id = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    version = Column(String(50))
    
    # System requirements
    min_ram_gb = Column(Integer, default=2)
    min_disk_gb = Column(Integer, default=20)
    min_cpu_cores = Column(Integer, default=1)
    
    # Template configuration
    iso_url = Column(String(500))
    disk_size = Column(String(10), default="32G")
    ram_mb = Column(Integer, default=4096)
    cpu_args = Column(Text)
    tpm_bypass = Column(Boolean, default=False)
    
    # Metadata
    is_official = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    download_count = Column(Integer, default=0)
    rating = Column(Float, default=0.0)
    
    # User templates
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_public = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    created_by = relationship("User", back_populates="created_templates")
    builds = relationship("Droplet", back_populates="template")

class UserTemplate(Base):
    __tablename__ = "user_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("windows_templates.id"), nullable=False)
    
    # Custom settings
    custom_name = Column(String(100))
    custom_config = Column(Text)  # JSON config overrides
    
    # Usage stats
    last_used = Column(DateTime(timezone=True))
    use_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    template = relationship("WindowsTemplate")