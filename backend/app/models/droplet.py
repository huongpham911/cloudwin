from sqlalchemy import Column, String, Integer, BigInteger, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.core.database import Base


class Droplet(Base):
    __tablename__ = "droplets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    do_droplet_id = Column(BigInteger, nullable=True)  # DigitalOcean's droplet ID
    
    # Basic info
    name = Column(String(255), nullable=False)
    region = Column(String(50), nullable=False)
    size = Column(String(50), nullable=False)
    image = Column(String(100), default="ubuntu-22-04-x64")
    
    # Status tracking
    status = Column(String(50), default="creating")  # creating, building, ready, error, stopped
    build_progress = Column(Integer, default=0)  # 0-100 percentage
    
    # RDP Connection info
    rdp_ip = Column(String(15), nullable=True)
    rdp_port = Column(Integer, default=3389)
    rdp_username = Column(String(100), nullable=True)
    rdp_password = Column(String(100), nullable=True)
    
    # Build information
    build_log = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Cost tracking
    hourly_cost = Column(String(20), nullable=True)  # Store as string for precision
    monthly_cost = Column(String(20), nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="droplets")


class DropletRegion(Base):
    """Cache for DigitalOcean regions"""
    __tablename__ = "droplet_regions"
    
    slug = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    available = Column(Boolean, default=True)
    features = Column(Text, nullable=True)  # JSON string
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BuildProgress(Base):
    """Track build progress for droplets"""
    __tablename__ = "build_progress"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    droplet_id = Column(String(36), ForeignKey("droplets.id", ondelete="CASCADE"), nullable=False)
    progress_percentage = Column(Integer, default=0)
    message = Column(String(500), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    droplet = relationship("Droplet", backref="build_progress_history")


class DropletSize(Base):
    """Cache for DigitalOcean sizes"""
    __tablename__ = "droplet_sizes"
    
    slug = Column(String(50), primary_key=True)
    memory = Column(Integer, nullable=False)  # MB
    vcpus = Column(Integer, nullable=False)
    disk = Column(Integer, nullable=False)  # GB
    transfer = Column(Integer, nullable=False)  # TB
    price_monthly = Column(String(20), nullable=False)
    price_hourly = Column(String(20), nullable=False)
    regions = Column(Text, nullable=True)  # JSON array of region slugs
    available = Column(Boolean, default=True)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
