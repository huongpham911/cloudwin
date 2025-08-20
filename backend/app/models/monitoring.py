from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class UserAlert(Base):
    __tablename__ = "user_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String(50), nullable=False)  # build_failed, cost_alert, etc.
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    metadata = Column(JSON, nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="user_alerts")
    
    def __repr__(self):
        return f"<UserAlert(id={self.id}, type='{self.alert_type}', severity='{self.severity}')>"

class UserUsageStats(Base):
    __tablename__ = "user_usage_stats"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    
    # Usage metrics
    droplets_created = Column(Integer, default=0)
    droplets_destroyed = Column(Integer, default=0)
    successful_builds = Column(Integer, default=0)
    failed_builds = Column(Integer, default=0)
    total_build_time_minutes = Column(Integer, default=0)
    total_cost_usd = Column(Float, default=0.0)
    
    # Most used resources
    most_used_template = Column(String(100), nullable=True)
    most_used_region = Column(String(50), nullable=True)
    most_used_size = Column(String(50), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="usage_stats")
    
    def __repr__(self):
        return f"<UserUsageStats(id={self.id}, user_id={self.user_id}, date='{self.date}')>"

class SystemMetrics(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # System metrics
    cpu_usage_percent = Column(Float, nullable=False)
    memory_usage_percent = Column(Float, nullable=False)
    disk_usage_percent = Column(Float, nullable=False)
    network_io_mbps = Column(Float, default=0.0)
    
    # Application metrics
    active_builds = Column(Integer, default=0)
    total_droplets = Column(Integer, default=0)
    active_connections = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<SystemMetrics(id={self.id}, timestamp='{self.timestamp}')>"