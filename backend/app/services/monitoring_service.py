import asyncio
import json
import psutil
import docker
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.droplet import Droplet
from app.models.user import User
from app.core.websocket import manager

class MonitoringService:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.metrics_cache = {}
        
    async def get_system_metrics(self) -> Dict:
        """Get real-time system metrics"""
        
        # CPU and Memory
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network
        network = psutil.net_io_counters()
        
        # Docker containers (QEMU VMs)
        containers = []
        try:
            for container in self.docker_client.containers.list():
                if 'qemu' in container.name.lower():
                    stats = container.stats(stream=False)
                    containers.append({
                        'name': container.name,
                        'status': container.status,
                        'cpu_usage': self._calculate_cpu_percent(stats),
                        'memory_usage': stats['memory_stats'].get('usage', 0),
                        'memory_limit': stats['memory_stats'].get('limit', 0)
                    })
        except Exception as e:
            print(f"Docker stats error: {e}")
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_used_gb': memory.used / (1024**3),
                'memory_total_gb': memory.total / (1024**3),
                'disk_percent': (disk.used / disk.total) * 100,
                'disk_used_gb': disk.used / (1024**3),
                'disk_total_gb': disk.total / (1024**3)
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            },
            'containers': containers
        }
    
    def _calculate_cpu_percent(self, stats: Dict) -> float:
        """Calculate CPU percentage from Docker stats"""
        try:
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            if system_delta > 0:
                return (cpu_delta / system_delta) * len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
        except (KeyError, ZeroDivisionError):
            pass
        return 0.0
    
    async def get_user_analytics(self, user_id: int, db: Session) -> Dict:
        """Get user-specific analytics"""
        
        # Droplet statistics
        total_droplets = db.query(Droplet).filter(Droplet.user_id == user_id).count()
        active_droplets = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.status == 'active'
        ).count()
        
        # Monthly usage
        current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_builds = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.created_at >= current_month
        ).count()
        
        # Cost estimation (mock data - integrate with DigitalOcean billing)
        estimated_monthly_cost = active_droplets * 24 * 0.012  # $0.012/hour average
        
        # Build success rate
        total_builds = db.query(Droplet).filter(Droplet.user_id == user_id).count()
        successful_builds = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.status == 'active'
        ).count()
        
        success_rate = (successful_builds / total_builds * 100) if total_builds > 0 else 0
        
        return {
            'user_id': user_id,
            'droplets': {
                'total': total_droplets,
                'active': active_droplets,
                'monthly_builds': monthly_builds
            },
            'costs': {
                'estimated_monthly': round(estimated_monthly_cost, 2),
                'estimated_daily': round(estimated_monthly_cost / 30, 2)
            },
            'performance': {
                'success_rate': round(success_rate, 1),
                'avg_build_time': await self._get_avg_build_time(user_id, db)
            }
        }
    
    async def _get_avg_build_time(self, user_id: int, db: Session) -> float:
        """Calculate average build time for user"""
        
        # Get completed builds from last 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        builds = db.query(Droplet).filter(
            Droplet.user_id == user_id,
            Droplet.status == 'active',
            Droplet.created_at >= thirty_days_ago
        ).all()
        
        if not builds:
            return 0.0
        
        # Mock calculation - in real implementation, track build start/end times
        total_time = sum([15 + (i % 10) for i in range(len(builds))])  # Mock: 15-25 minutes
        return round(total_time / len(builds), 1)
    
    async def check_resource_alerts(self, db: Session) -> List[Dict]:
        """Check for resource usage alerts"""
        alerts = []
        
        # System resource alerts
        metrics = await self.get_system_metrics()
        system = metrics['system']
        
        if system['cpu_percent'] > 90:
            alerts.append({
                'type': 'system',
                'level': 'critical',
                'message': f"High CPU usage: {system['cpu_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        if system['memory_percent'] > 85:
            alerts.append({
                'type': 'system',
                'level': 'warning',
                'message': f"High memory usage: {system['memory_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        if system['disk_percent'] > 80:
            alerts.append({
                'type': 'system',
                'level': 'warning',
                'message': f"High disk usage: {system['disk_percent']:.1f}%",
                'timestamp': datetime.utcnow().isoformat()
            })
        
        # User quota alerts
        users_near_limit = db.query(User).filter(
            User.current_month_builds >= User.monthly_build_limit * 0.8
        ).all()
        
        for user in users_near_limit:
            alerts.append({
                'type': 'quota',
                'level': 'info',
                'message': f"User {user.email} approaching monthly build limit",
                'user_id': user.id,
                'timestamp': datetime.utcnow().isoformat()
            })
        
        return alerts
    
    async def start_monitoring_loop(self):
        """Start continuous monitoring loop"""
        while True:
            try:
                # Get system metrics
                metrics = await self.get_system_metrics()
                
                # Cache metrics
                self.metrics_cache['latest'] = metrics
                
                # Check for alerts
                db = next(get_db())
                alerts = await self.check_resource_alerts(db)
                
                # Send alerts via WebSocket to admin users
                if alerts:
                    await manager.broadcast_to_admins({
                        'type': 'system_alert',
                        'alerts': alerts
                    })
                
                # Wait 30 seconds before next check
                await asyncio.sleep(30)
                
            except Exception as e:
                print(f"Monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error

# Global monitoring service instance
monitoring_service = MonitoringService()