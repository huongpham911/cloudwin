import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.droplet import Droplet
from app.models.user import User
from app.core.websocket import manager
from app.services.digitalocean_service import DigitalOceanService

class CostOptimizer:
    def __init__(self):
        self.do_service = DigitalOceanService()
        self.cost_thresholds = {
            'daily_warning': 10.0,    # $10/day
            'daily_critical': 25.0,   # $25/day
            'monthly_warning': 200.0, # $200/month
            'monthly_critical': 500.0 # $500/month
        }
    
    async def calculate_user_costs(self, user_id: int, db: Session) -> Dict:
        """Calculate detailed cost breakdown for user"""
        
        # Get user's active droplets
        droplets = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.status.in_(['active', 'building'])
        ).all()
        
        total_hourly = 0.0
        droplet_costs = []
        
        for droplet in droplets:
            # Get DigitalOcean pricing for droplet size
            hourly_cost = await self._get_droplet_hourly_cost(droplet.size)
            
            # Calculate runtime hours
            runtime_hours = self._calculate_runtime_hours(droplet)
            
            droplet_cost = {
                'droplet_id': droplet.id,
                'name': droplet.name,
                'size': droplet.size,
                'hourly_rate': hourly_cost,
                'runtime_hours': runtime_hours,
                'total_cost': hourly_cost * runtime_hours,
                'status': droplet.status,
                'created_at': droplet.created_at.isoformat()
            }
            
            droplet_costs.append(droplet_cost)
            total_hourly += hourly_cost
        
        # Calculate projections
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days_in_month = (datetime.utcnow().replace(month=datetime.utcnow().month + 1, day=1) - timedelta(days=1)).day
        days_elapsed = (datetime.utcnow() - current_month_start).days + 1
        days_remaining = days_in_month - days_elapsed
        
        # Current month costs
        current_month_cost = sum([d['total_cost'] for d in droplet_costs if 
                                datetime.fromisoformat(d['created_at']) >= current_month_start])
        
        # Projections
        daily_projection = total_hourly * 24
        monthly_projection = daily_projection * days_in_month
        remaining_month_projection = daily_projection * days_remaining
        
        return {
            'user_id': user_id,
            'current_costs': {
                'hourly': round(total_hourly, 4),
                'daily': round(daily_projection, 2),
                'current_month': round(current_month_cost, 2),
                'projected_month': round(current_month_cost + remaining_month_projection, 2)
            },
            'droplets': droplet_costs,
            'optimization_suggestions': await self._get_optimization_suggestions(droplets, db),
            'alerts': self._check_cost_alerts(daily_projection, current_month_cost + remaining_month_projection)
        }
    
    async def _get_droplet_hourly_cost(self, size: str) -> float:
        """Get hourly cost for droplet size"""
        # DigitalOcean pricing (as of 2024)
        pricing = {
            's-1vcpu-1gb': 0.00744,      # $5/month
            's-1vcpu-2gb': 0.01488,      # $10/month  
            's-2vcpu-2gb': 0.02232,      # $15/month
            's-2vcpu-4gb': 0.02976,      # $20/month
            's-4vcpu-8gb': 0.05952,      # $40/month
            's-8vcpu-16gb': 0.11905,     # $80/month
            'c-2': 0.05952,              # $40/month CPU-optimized
            'c-4': 0.11905,              # $80/month CPU-optimized
            'm-2vcpu-16gb': 0.08928,     # $60/month Memory-optimized
            'm-4vcpu-32gb': 0.17857,     # $120/month Memory-optimized
        }
        
        return pricing.get(size, 0.02976)  # Default to $20/month
    
    def _calculate_runtime_hours(self, droplet: Droplet) -> float:
        """Calculate droplet runtime in hours"""
        if droplet.status == 'active':
            runtime = datetime.utcnow() - droplet.created_at
            return runtime.total_seconds() / 3600
        return 0.0
    
    async def _get_optimization_suggestions(self, droplets: List[Droplet], db: Session) -> List[Dict]:
        """Generate cost optimization suggestions"""
        suggestions = []
        
        for droplet in droplets:
            # Check for idle droplets (no recent activity)
            if droplet.status == 'active':
                last_activity = droplet.updated_at or droplet.created_at
                idle_hours = (datetime.utcnow() - last_activity).total_seconds() / 3600
                
                if idle_hours > 24:  # Idle for more than 24 hours
                    suggestions.append({
                        'type': 'idle_droplet',
                        'droplet_id': droplet.id,
                        'droplet_name': droplet.name,
                        'message': f"Droplet has been idle for {idle_hours:.1f} hours",
                        'potential_savings': await self._get_droplet_hourly_cost(droplet.size) * idle_hours,
                        'action': 'Consider stopping or deleting this droplet'
                    })
            
            # Check for oversized droplets
            if droplet.size in ['s-8vcpu-16gb', 'm-4vcpu-32gb']:
                suggestions.append({
                    'type': 'oversized_droplet',
                    'droplet_id': droplet.id,
                    'droplet_name': droplet.name,
                    'message': f"Large droplet size ({droplet.size}) may be unnecessary",
                    'potential_savings': (await self._get_droplet_hourly_cost(droplet.size) - 
                                        await self._get_droplet_hourly_cost('s-4vcpu-8gb')) * 24 * 30,
                    'action': 'Consider downsizing to s-4vcpu-8gb'
                })
        
        # Check for multiple droplets in same region
        region_counts = {}
        for droplet in droplets:
            region_counts[droplet.region] = region_counts.get(droplet.region, 0) + 1
        
        for region, count in region_counts.items():
            if count > 3:
                suggestions.append({
                    'type': 'region_consolidation',
                    'message': f"{count} droplets in {region} region",
                    'potential_savings': 0,  # Network cost savings
                    'action': 'Consider consolidating workloads'
                })
        
        return suggestions
    
    def _check_cost_alerts(self, daily_cost: float, monthly_projection: float) -> List[Dict]:
        """Check for cost threshold alerts"""
        alerts = []
        
        if daily_cost >= self.cost_thresholds['daily_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'daily_cost',
                'message': f"Daily cost ${daily_cost:.2f} exceeds critical threshold",
                'threshold': self.cost_thresholds['daily_critical']
            })
        elif daily_cost >= self.cost_thresholds['daily_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'daily_cost',
                'message': f"Daily cost ${daily_cost:.2f} exceeds warning threshold",
                'threshold': self.cost_thresholds['daily_warning']
            })
        
        if monthly_projection >= self.cost_thresholds['monthly_critical']:
            alerts.append({
                'level': 'critical',
                'type': 'monthly_projection',
                'message': f"Monthly projection ${monthly_projection:.2f} exceeds critical threshold",
                'threshold': self.cost_thresholds['monthly_critical']
            })
        elif monthly_projection >= self.cost_thresholds['monthly_warning']:
            alerts.append({
                'level': 'warning',
                'type': 'monthly_projection',
                'message': f"Monthly projection ${monthly_projection:.2f} exceeds warning threshold",
                'threshold': self.cost_thresholds['monthly_warning']
            })
        
        return alerts
    
    async def auto_optimize_costs(self, db: Session):
        """Automatically optimize costs for all users"""
        
        # Get all users with active droplets
        users_with_droplets = db.query(User).join(Droplet).filter(
            Droplet.status.in_(['active', 'building'])
        ).distinct().all()
        
        for user in users_with_droplets:
            try:
                cost_analysis = await self.calculate_user_costs(user.id, db)
                
                # Send cost alerts to users
                if cost_analysis['alerts']:
                    await manager.send_to_user(user.id, {
                        'type': 'cost_alert',
                        'alerts': cost_analysis['alerts'],
                        'suggestions': cost_analysis['optimization_suggestions']
                    })
                
                # Auto-stop idle droplets (with user permission)
                if user.auto_optimize_costs:  # User setting
                    await self._auto_stop_idle_droplets(user.id, db)
                
            except Exception as e:
                print(f"Cost optimization error for user {user.id}: {e}")
    
    async def _auto_stop_idle_droplets(self, user_id: int, db: Session):
        """Automatically stop idle droplets"""
        
        idle_threshold = 48  # 48 hours
        current_time = datetime.utcnow()
        
        idle_droplets = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.status == 'active',
            Droplet.updated_at < current_time - timedelta(hours=idle_threshold)
        ).all()
        
        for droplet in idle_droplets:
            try:
                # Stop droplet via DigitalOcean API
                await self.do_service.power_off_droplet(droplet.do_droplet_id)
                
                # Update status
                droplet.status = 'stopped'
                db.commit()
                
                # Notify user
                await manager.send_to_user(user_id, {
                    'type': 'droplet_auto_stopped',
                    'droplet_id': droplet.id,
                    'droplet_name': droplet.name,
                    'reason': f'Idle for {idle_threshold} hours',
                    'savings': f"${await self._get_droplet_hourly_cost(droplet.size) * 24:.2f}/day"
                })
                
            except Exception as e:
                print(f"Failed to auto-stop droplet {droplet.id}: {e}")
    
    async def start_cost_monitoring_loop(self):
        """Start continuous cost monitoring"""
        while True:
            try:
                db = next(get_db())
                await self.auto_optimize_costs(db)
                
                # Run every 6 hours
                await asyncio.sleep(6 * 3600)
                
            except Exception as e:
                print(f"Cost monitoring error: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour on error

# Global cost optimizer
cost_optimizer = CostOptimizer()