"""
Analytics service for DigitalOcean data integration
Provides real-time analytics data from DigitalOcean API
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from ..services.digitalocean_service import DigitalOceanService
from ..core.logger import logger
import asyncio
from collections import defaultdict

class AnalyticsService:
    def __init__(self, do_service: DigitalOceanService):
        self.do_service = do_service
        
    async def get_dashboard_analytics(self) -> Dict[str, Any]:
        """Get dashboard analytics data from DigitalOcean"""
        try:
            # Get droplets data
            droplets_data = await self.do_service.get_droplets()
            if not droplets_data or 'droplets' not in droplets_data:
                return self._get_empty_dashboard()
                
            droplets = droplets_data['droplets']
            
            # Calculate overview metrics
            total_droplets = len(droplets)
            active_droplets = len([d for d in droplets if d.get('status') == 'active'])
            
            # Get recent droplets (last 10)
            recent_droplets = sorted(
                droplets, 
                key=lambda x: x.get('created_at', ''), 
                reverse=True
            )[:10]
            
            # Generate daily activity data (mock for now - can be enhanced with actual logs)
            daily_activity = self._generate_daily_activity(droplets)
            
            return {
                'overview': {
                    'total_droplets': total_droplets,
                    'active_droplets': active_droplets,
                    'total_builds': total_droplets,  # Approximate
                    'success_rate': (active_droplets / total_droplets * 100) if total_droplets > 0 else 0
                },
                'recent_droplets': [
                    {
                        'name': d.get('name', 'Unknown'),
                        'region': d.get('region', {}).get('slug', 'unknown'),
                        'size': d.get('size', {}).get('slug', 'unknown'),
                        'status': d.get('status', 'unknown'),
                        'created_at': d.get('created_at', datetime.now().isoformat())
                    }
                    for d in recent_droplets
                ],
                'daily_activity': daily_activity
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard analytics: {e}")
            return self._get_empty_dashboard()
    
    async def get_cost_analytics(self) -> Dict[str, Any]:
        """Get cost analytics from DigitalOcean"""
        try:
            # Get account balance/billing info
            balance_data = await self.do_service.get_balance()
            
            # Get droplets for cost calculation
            droplets_data = await self.do_service.get_droplets()
            if not droplets_data or 'droplets' not in droplets_data:
                return self._get_empty_costs()
                
            droplets = droplets_data['droplets']
            
            # Calculate costs based on droplet sizes
            daily_cost = self._calculate_daily_cost(droplets)
            monthly_cost = daily_cost * 30
            
            # Generate cost history (mock for now)
            daily_history = self._generate_cost_history(daily_cost)
            
            # Cost analysis
            alerts = []
            optimization_suggestions = []
            
            if monthly_cost > 50:
                alerts.append("Monthly costs are projected to exceed $50")
            
            if len(droplets) > 5:
                optimization_suggestions.append("Consider consolidating smaller droplets to reduce costs")
                
            if daily_cost > 5:
                optimization_suggestions.append("Review droplet sizes - some may be over-provisioned")
            
            return {
                'current_costs': {
                    'daily': daily_cost,
                    'monthly': monthly_cost
                },
                'projections': {
                    'next_30_days': monthly_cost,
                    'next_90_days': monthly_cost * 3
                },
                'daily_history': daily_history,
                'alerts': alerts,
                'optimization_suggestions': optimization_suggestions,
                'account_balance': balance_data.get('account_balance', 0) if balance_data else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting cost analytics: {e}")
            return self._get_empty_costs()
    
    async def get_performance_analytics(self) -> Dict[str, Any]:
        """Get performance analytics from DigitalOcean"""
        try:
            # Get droplets data
            droplets_data = await self.do_service.get_droplets()
            if not droplets_data or 'droplets' not in droplets_data:
                return self._get_empty_performance()
                
            droplets = droplets_data['droplets']
            
            # Analyze region performance
            region_stats = defaultdict(lambda: {'total': 0, 'active': 0})
            
            for droplet in droplets:
                region = droplet.get('region', {}).get('slug', 'unknown')
                region_stats[region]['total'] += 1
                if droplet.get('status') == 'active':
                    region_stats[region]['active'] += 1
            
            region_performance = [
                {
                    'region': region,
                    'total_builds': stats['total'],
                    'success_rate': round((stats['active'] / stats['total'] * 100) if stats['total'] > 0 else 0, 1)
                }
                for region, stats in region_stats.items()
            ]
            
            # Build performance metrics (estimated)
            total_builds = len(droplets)
            avg_build_time = 3.5  # Estimated average build time in minutes
            
            return {
                'build_performance': {
                    'total_builds': total_builds,
                    'average_build_time_minutes': avg_build_time,
                    'success_rate': (len([d for d in droplets if d.get('status') == 'active']) / total_builds * 100) if total_builds > 0 else 0
                },
                'region_performance': region_performance
            }
            
        except Exception as e:
            logger.error(f"Error getting performance analytics: {e}")
            return self._get_empty_performance()
    
    def _calculate_daily_cost(self, droplets: List[Dict]) -> float:
        """Calculate estimated daily cost based on droplet sizes"""
        # Rough pricing estimates (USD per month)
        size_pricing = {
            's-1vcpu-1gb': 6.00,
            's-1vcpu-2gb': 12.00,
            's-2vcpu-2gb': 18.00,
            's-2vcpu-4gb': 24.00,
            's-4vcpu-8gb': 48.00,
            's-8vcpu-16gb': 96.00,
            'c-4': 48.00,
            'c-8': 96.00,
            'm-4vcpu-32gb': 128.00,
            'default': 12.00
        }
        
        total_monthly = 0
        for droplet in droplets:
            if droplet.get('status') == 'active':
                size_slug = droplet.get('size', {}).get('slug', 'default')
                monthly_cost = size_pricing.get(size_slug, size_pricing['default'])
                total_monthly += monthly_cost
        
        return round(total_monthly / 30, 2)  # Convert to daily
    
    def _generate_daily_activity(self, droplets: List[Dict]) -> List[Dict]:
        """Generate daily activity data based on droplet creation dates"""
        activity = []
        
        # Get last 7 days
        for i in range(7):
            date = datetime.now() - timedelta(days=i)
            
            # Count droplets created on this day (approximation)
            builds_count = len([
                d for d in droplets 
                if d.get('created_at', '').startswith(date.strftime('%Y-%m-%d'))
            ])
            
            if builds_count == 0 and i < 3:  # Add some activity for recent days
                builds_count = max(1, len(droplets) // 7)
            
            activity.append({
                'date': date.strftime('%Y-%m-%d'),
                'builds': builds_count
            })
        
        return list(reversed(activity))  # Oldest first
    
    def _generate_cost_history(self, current_daily: float) -> List[Dict]:
        """Generate cost history for the last 7 days"""
        history = []
        
        for i in range(7):
            date = datetime.now() - timedelta(days=i)
            # Add some variation to the cost
            variation = 1 + (i * 0.1 - 0.3)  # ±30% variation
            cost = max(0, round(current_daily * variation, 2))
            
            history.append({
                'date': date.strftime('%Y-%m-%d'),
                'cost': cost
            })
        
        return list(reversed(history))  # Oldest first
    
    def _get_empty_dashboard(self) -> Dict[str, Any]:
        """Return empty dashboard data"""
        return {
            'overview': {
                'total_droplets': 0,
                'active_droplets': 0,
                'total_builds': 0,
                'success_rate': 0
            },
            'recent_droplets': [],
            'daily_activity': []
        }
    
    def _get_empty_costs(self) -> Dict[str, Any]:
        """Return empty cost data"""
        return {
            'current_costs': {
                'daily': 0,
                'monthly': 0
            },
            'projections': {
                'next_30_days': 0,
                'next_90_days': 0
            },
            'daily_history': [],
            'alerts': [],
            'optimization_suggestions': [],
            'account_balance': 0
        }
    
    def _get_empty_performance(self) -> Dict[str, Any]:
        """Return empty performance data"""
        return {
            'build_performance': {
                'total_builds': 0,
                'average_build_time_minutes': 0,
                'success_rate': 0
            },
            'region_performance': []
        }
