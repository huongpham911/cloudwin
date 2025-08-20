import asyncio
import psutil
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.droplet import Droplet
from app.models.user import User
from app.services.websocket_manager import manager

class AdvancedMonitoringService:
    def __init__(self):
        self.metrics_history = []
        self.alerts_config = {
            'cpu_threshold': 80,
            'memory_threshold': 85,
            'disk_threshold': 90,
            'build_failure_threshold': 3
        }
        self.is_running = False

    async def start_monitoring(self):
        """Start the advanced monitoring loop"""
        self.is_running = True
        
        # Start multiple monitoring tasks
        await asyncio.gather(
            self.system_metrics_monitor(),
            self.droplet_health_monitor(),
            self.build_performance_monitor(),
            self.cost_optimization_monitor(),
            self.security_monitor()
        )

    async def system_metrics_monitor(self):
        """Monitor system performance metrics"""
        while self.is_running:
            try:
                # Collect system metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                metrics = {
                    'timestamp': datetime.utcnow(),
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory.percent,
                    'memory_available': memory.available,
                    'disk_percent': disk.percent,
                    'disk_free': disk.free,
                    'load_average': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0
                }
                
                # Store metrics
                self.metrics_history.append(metrics)
                
                # Keep only last 1000 entries
                if len(self.metrics_history) > 1000:
                    self.metrics_history = self.metrics_history[-1000:]
                
                # Check for alerts
                await self.check_system_alerts(metrics)
                
                # Broadcast to admin users
                await manager.broadcast_to_admins({
                    'type': 'system_metrics',
                    'data': metrics
                })
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                print(f"System metrics error: {e}")
                await asyncio.sleep(60)

    async def droplet_health_monitor(self):
        """Monitor droplet health and status"""
        while self.is_running:
            try:
                db = next(get_db())
                
                # Get all active droplets
                droplets = db.query(Droplet).filter(
                    Droplet.status.in_(['building', 'active', 'ready'])
                ).all()
                
                health_data = []
                
                for droplet in droplets:
                    # Check droplet health
                    health_status = await self.check_droplet_health(droplet)
                    health_data.append({
                        'droplet_id': droplet.id,
                        'name': droplet.name,
                        'status': droplet.status,
                        'health': health_status,
                        'last_check': datetime.utcnow()
                    })
                    
                    # Send individual updates to droplet owner
                    if health_status['status'] != 'healthy':
                        await manager.send_to_user(droplet.user_id, {
                            'type': 'droplet_health_alert',
                            'droplet_id': droplet.id,
                            'health': health_status
                        })
                
                # Broadcast summary to admins
                await manager.broadcast_to_admins({
                    'type': 'droplet_health_summary',
                    'data': health_data
                })
                
                await asyncio.sleep(120)  # Check every 2 minutes
                
            except Exception as e:
                print(f"Droplet health monitor error: {e}")
                await asyncio.sleep(180)

    async def check_droplet_health(self, droplet: Droplet) -> Dict:
        """Check individual droplet health"""
        health_status = {
            'status': 'healthy',
            'issues': [],
            'recommendations': []
        }
        
        # Check build time for building droplets
        if droplet.status == 'building':
            build_time = (datetime.utcnow() - droplet.created_at).total_seconds() / 60
            if build_time > 30:  # More than 30 minutes
                health_status['status'] = 'warning'
                health_status['issues'].append('Build taking longer than expected')
                health_status['recommendations'].append('Consider restarting the build')
        
        # Check for stuck droplets
        if droplet.updated_at:
            last_update = (datetime.utcnow() - droplet.updated_at).total_seconds() / 60
            if last_update > 60 and droplet.status == 'building':  # No update for 1 hour
                health_status['status'] = 'critical'
                health_status['issues'].append('Droplet appears to be stuck')
                health_status['recommendations'].append('Restart or delete the droplet')
        
        return health_status

    async def build_performance_monitor(self):
        """Monitor build performance and success rates"""
        while self.is_running:
            try:
                db = next(get_db())
                
                # Calculate build metrics for last 24 hours
                yesterday = datetime.utcnow() - timedelta(days=1)
                
                recent_builds = db.query(Droplet).filter(
                    Droplet.created_at >= yesterday
                ).all()
                
                if recent_builds:
                    total_builds = len(recent_builds)
                    successful_builds = len([d for d in recent_builds if d.status == 'ready'])
                    failed_builds = len([d for d in recent_builds if d.status == 'error'])
                    
                    success_rate = (successful_builds / total_builds) * 100
                    
                    # Calculate average build time
                    completed_builds = [d for d in recent_builds if d.status in ['ready', 'error']]
                    if completed_builds:
                        avg_build_time = sum([
                            (d.updated_at - d.created_at).total_seconds() / 60
                            for d in completed_builds if d.updated_at
                        ]) / len(completed_builds)
                    else:
                        avg_build_time = 0
                    
                    performance_data = {
                        'timestamp': datetime.utcnow(),
                        'total_builds': total_builds,
                        'successful_builds': successful_builds,
                        'failed_builds': failed_builds,
                        'success_rate': success_rate,
                        'avg_build_time': avg_build_time
                    }
                    
                    # Check for performance alerts
                    if success_rate < 80:
                        await manager.broadcast_to_admins({
                            'type': 'performance_alert',
                            'message': f'Build success rate dropped to {success_rate:.1f}%',
                            'data': performance_data
                        })
                    
                    # Broadcast performance data
                    await manager.broadcast_to_admins({
                        'type': 'build_performance',
                        'data': performance_data
                    })
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                print(f"Build performance monitor error: {e}")
                await asyncio.sleep(600)

    async def cost_optimization_monitor(self):
        """Monitor costs and suggest optimizations"""
        while self.is_running:
            try:
                db = next(get_db())
                
                # Get all users with active droplets
                users_with_droplets = db.query(User).join(Droplet).filter(
                    Droplet.status.in_(['active', 'ready'])
                ).distinct().all()
                
                for user in users_with_droplets:
                    # Calculate user's monthly cost
                    user_droplets = db.query(Droplet).filter(
                        Droplet.user_id == user.id,
                        Droplet.status.in_(['active', 'ready'])
                    ).all()
                    
                    monthly_cost = sum([
                        self.calculate_droplet_monthly_cost(d) for d in user_droplets
                    ])
                    
                    # Check for cost optimization opportunities
                    optimizations = await self.analyze_cost_optimizations(user_droplets)
                    
                    if optimizations:
                        await manager.send_to_user(user.id, {
                            'type': 'cost_optimization',
                            'monthly_cost': monthly_cost,
                            'optimizations': optimizations
                        })
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                print(f"Cost optimization monitor error: {e}")
                await asyncio.sleep(3600)

    def calculate_droplet_monthly_cost(self, droplet: Droplet) -> float:
        """Calculate estimated monthly cost for a droplet"""
        # This would integrate with DigitalOcean pricing API
        # For now, return estimated costs based on size
        size_costs = {
            's-1vcpu-1gb': 5.0,
            's-1vcpu-2gb': 10.0,
            's-2vcpu-2gb': 15.0,
            's-2vcpu-4gb': 20.0,
            's-4vcpu-8gb': 40.0,
        }
        return size_costs.get(droplet.size, 20.0)

    async def analyze_cost_optimizations(self, droplets: List[Droplet]) -> List[Dict]:
        """Analyze cost optimization opportunities"""
        optimizations = []
        
        for droplet in droplets:
            # Check for oversized droplets (running for >7 days with high specs)
            if droplet.size in ['s-4vcpu-8gb', 's-8vcpu-16gb']:
                days_running = (datetime.utcnow() - droplet.created_at).days
                if days_running > 7:
                    optimizations.append({
                        'type': 'downsize',
                        'droplet_id': droplet.id,
                        'droplet_name': droplet.name,
                        'current_size': droplet.size,
                        'suggested_size': 's-2vcpu-4gb',
                        'potential_savings': 20.0,
                        'message': 'Consider downsizing this long-running droplet'
                    })
            
            # Check for idle droplets (no recent activity)
            if droplet.updated_at:
                days_idle = (datetime.utcnow() - droplet.updated_at).days
                if days_idle > 3:
                    optimizations.append({
                        'type': 'idle',
                        'droplet_id': droplet.id,
                        'droplet_name': droplet.name,
                        'days_idle': days_idle,
                        'monthly_cost': self.calculate_droplet_monthly_cost(droplet),
                        'message': 'This droplet appears to be idle'
                    })
        
        return optimizations

    async def security_monitor(self):
        """Monitor security events and threats"""
        while self.is_running:
            try:
                # Monitor for suspicious activities
                security_events = await self.check_security_events()
                
                if security_events:
                    await manager.broadcast_to_admins({
                        'type': 'security_alert',
                        'events': security_events
                    })
                
                await asyncio.sleep(600)  # Check every 10 minutes
                
            except Exception as e:
                print(f"Security monitor error: {e}")
                await asyncio.sleep(600)

    async def check_security_events(self) -> List[Dict]:
        """Check for security events"""
        events = []
        
        # This would integrate with security monitoring tools
        # For now, return empty list
        
        return events

    async def check_system_alerts(self, metrics: Dict):
        """Check system metrics against alert thresholds"""
        alerts = []
        
        if metrics['cpu_percent'] > self.alerts_config['cpu_threshold']:
            alerts.append({
                'type': 'cpu_high',
                'value': metrics['cpu_percent'],
                'threshold': self.alerts_config['cpu_threshold'],
                'message': f"CPU usage is {metrics['cpu_percent']:.1f}%"
            })
        
        if metrics['memory_percent'] > self.alerts_config['memory_threshold']:
            alerts.append({
                'type': 'memory_high',
                'value': metrics['memory_percent'],
                'threshold': self.alerts_config['memory_threshold'],
                'message': f"Memory usage is {metrics['memory_percent']:.1f}%"
            })
        
        if metrics['disk_percent'] > self.alerts_config['disk_threshold']:
            alerts.append({
                'type': 'disk_high',
                'value': metrics['disk_percent'],
                'threshold': self.alerts_config['disk_threshold'],
                'message': f"Disk usage is {metrics['disk_percent']:.1f}%"
            })
        
        if alerts:
            await manager.broadcast_to_admins({
                'type': 'system_alerts',
                'alerts': alerts,
                'timestamp': datetime.utcnow()
            })

    def stop_monitoring(self):
        """Stop the monitoring service"""
        self.is_running = False

# Global monitoring service instance
advanced_monitoring = AdvancedMonitoringService()