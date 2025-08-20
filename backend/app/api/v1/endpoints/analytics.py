"""
Analytics API routes
Provides endpoints for dashboard analytics, costs, and performance data
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from ...services.analytics_service import AnalyticsService
from ...services.digitalocean_service import DigitalOceanService
from ...core.logger import logger

router = APIRouter()

async def get_analytics_service() -> AnalyticsService:
    """Dependency to get analytics service"""
    do_service = DigitalOceanService()
    return AnalyticsService(do_service)

@router.get("/dashboard")
async def get_dashboard_analytics(
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Dict[str, Any]:
    """
    Get dashboard analytics data
    Returns overview metrics, recent droplets, and daily activity
    """
    try:
        data = await analytics_service.get_dashboard_analytics()
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error in dashboard analytics endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard analytics: {str(e)}")

@router.get("/costs")
async def get_cost_analytics(
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Dict[str, Any]:
    """
    Get cost analytics data
    Returns current costs, projections, history, and optimization suggestions
    """
    try:
        data = await analytics_service.get_cost_analytics()
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error in cost analytics endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cost analytics: {str(e)}")

@router.get("/performance")
async def get_performance_analytics(
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Dict[str, Any]:
    """
    Get performance analytics data
    Returns build performance and regional performance metrics
    """
    try:
        data = await analytics_service.get_performance_analytics()
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        logger.error(f"Error in performance analytics endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance analytics: {str(e)}")

@router.get("/summary")
async def get_analytics_summary(
    analytics_service: AnalyticsService = Depends(get_analytics_service)
) -> Dict[str, Any]:
    """
    Get combined analytics summary
    Returns key metrics from all analytics categories
    """
    try:
        # Get all analytics data
        dashboard_data = await analytics_service.get_dashboard_analytics()
        cost_data = await analytics_service.get_cost_analytics()
        performance_data = await analytics_service.get_performance_analytics()
        
        # Create summary
        summary = {
            "total_droplets": dashboard_data.get("overview", {}).get("total_droplets", 0),
            "active_droplets": dashboard_data.get("overview", {}).get("active_droplets", 0),
            "daily_cost": cost_data.get("current_costs", {}).get("daily", 0),
            "monthly_cost": cost_data.get("current_costs", {}).get("monthly", 0),
            "avg_build_time": performance_data.get("build_performance", {}).get("average_build_time_minutes", 0),
            "total_builds": performance_data.get("build_performance", {}).get("total_builds", 0),
            "active_regions": len(performance_data.get("region_performance", [])),
            "alerts_count": len(cost_data.get("alerts", [])),
            "last_updated": "now"
        }
        
        return {
            "success": True,
            "data": summary
        }
    except Exception as e:
        logger.error(f"Error in analytics summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get analytics summary: {str(e)}")
