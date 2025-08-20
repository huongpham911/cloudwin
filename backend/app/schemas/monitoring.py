from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class MetricPoint(BaseModel):
    timestamp: datetime
    value: float

class SystemMetricsResponse(BaseModel):
    cpu_usage: List[MetricPoint]
    memory_usage: List[MetricPoint]
    disk_usage: List[MetricPoint]
    network_io: List[MetricPoint]
    active_builds: int
    total_droplets: int
    time_range: Dict[str, Any]

class ServiceStatus(BaseModel):
    name: str
    status: str
    last_check: datetime
    response_time_ms: Optional[float] = None

class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Overall system status")
    services: Dict[str, ServiceStatus]
    database_status: str
    redis_status: str
    digitalocean_api_status: str
    active_connections: int
    uptime_seconds: int
    last_check: str

class AlertResponse(BaseModel):
    id: int
    type: str
    severity: str
    message: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

class UsageStatsResponse(BaseModel):
    total_droplets_created: int
    active_droplets: int
    total_build_time_minutes: int
    successful_builds: int
    failed_builds: int
    success_rate: float = Field(..., ge=0.0, le=1.0)
    total_cost_usd: float
    avg_build_time_minutes: float
    most_used_template: Optional[str] = None
    most_used_region: Optional[str] = None
    time_period_days: int