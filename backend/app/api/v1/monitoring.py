from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.advanced_monitoring import AdvancedMonitoringService
from app.services.websocket_manager import websocket_manager
from app.schemas.monitoring import (
    SystemMetricsResponse,
    HealthCheckResponse,
    AlertResponse,
    UsageStatsResponse
)

router = APIRouter()

@router.get("/metrics", response_model=SystemMetricsResponse)
async def get_system_metrics(
    hours: int = Query(default=24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system performance metrics"""
    monitoring_service = AdvancedMonitoringService()
    
    try:
        # Get metrics for specified time period
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        metrics = await monitoring_service.get_system_metrics(start_time, end_time)
        
        return SystemMetricsResponse(
            cpu_usage=metrics.get("cpu_usage", []),
            memory_usage=metrics.get("memory_usage", []),
            disk_usage=metrics.get("disk_usage", []),
            network_io=metrics.get("network_io", []),
            active_builds=metrics.get("active_builds", 0),
            total_droplets=metrics.get("total_droplets", 0),
            time_range={
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
                "hours": hours
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@router.get("/health", response_model=HealthCheckResponse)
async def get_health_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get system health status"""
    monitoring_service = AdvancedMonitoringService()
    
    try:
        health_data = await monitoring_service.get_health_status()
        
        return HealthCheckResponse(
            status=health_data.get("status", "unknown"),
            services=health_data.get("services", {}),
            database_status=health_data.get("database_status", "unknown"),
            redis_status=health_data.get("redis_status", "unknown"),
            digitalocean_api_status=health_data.get("digitalocean_api_status", "unknown"),
            active_connections=websocket_manager.get_total_connections(),
            uptime_seconds=health_data.get("uptime_seconds", 0),
            last_check=datetime.utcnow().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.get("/alerts", response_model=List[AlertResponse])
async def get_active_alerts(
    severity: Optional[str] = Query(None, regex="^(low|medium|high|critical)$"),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get active system alerts"""
    monitoring_service = AdvancedMonitoringService()
    
    try:
        alerts = await monitoring_service.get_active_alerts(
            severity_filter=severity,
            limit=limit,
            user_id=current_user.id
        )
        
        return [
            AlertResponse(
                id=alert.get("id"),
                type=alert.get("type"),
                severity=alert.get("severity"),
                message=alert.get("message"),
                created_at=alert.get("created_at"),
                resolved_at=alert.get("resolved_at"),
                metadata=alert.get("metadata", {})
            )
            for alert in alerts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get alerts: {str(e)}")

@router.get("/usage-stats", response_model=UsageStatsResponse)
async def get_usage_statistics(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user usage statistics"""
    monitoring_service = AdvancedMonitoringService()
    
    try:
        stats = await monitoring_service.get_user_usage_stats(
            user_id=current_user.id,
            days=days
        )
        
        return UsageStatsResponse(
            total_droplets_created=stats.get("total_droplets_created", 0),
            active_droplets=stats.get("active_droplets", 0),
            total_build_time_minutes=stats.get("total_build_time_minutes", 0),
            successful_builds=stats.get("successful_builds", 0),
            failed_builds=stats.get("failed_builds", 0),
            success_rate=stats.get("success_rate", 0.0),
            total_cost_usd=stats.get("total_cost_usd", 0.0),
            avg_build_time_minutes=stats.get("avg_build_time_minutes", 0.0),
            most_used_template=stats.get("most_used_template"),
            most_used_region=stats.get("most_used_region"),
            time_period_days=days
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {str(e)}")

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark an alert as resolved"""
    monitoring_service = AdvancedMonitoringService()
    
    try:
        success = await monitoring_service.resolve_alert(alert_id, current_user.id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found or already resolved")
        
        return {"message": "Alert resolved successfully", "alert_id": alert_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {str(e)}")