from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_superuser, require_admin, require_user_or_admin
from app.models.auth_models import User
from app.models.droplet import Droplet
from app.services.monitoring_service import monitoring_service
from app.services.cost_optimizer import cost_optimizer
from app.utils.permissions import check_role_permission

router = APIRouter()

@router.get("/dashboard")
async def get_user_dashboard_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user_or_admin)
):
    """Get dashboard analytics - admin sees all, users see their own"""
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Role-based filtering
    if current_user.is_admin():
        # Admin sees all data
        base_filter = Droplet.created_at >= start_date
        user_filter = None
    else:
        # User sees only their data
        base_filter = and_(Droplet.user_id == current_user.id, Droplet.created_at >= start_date)
        user_filter = Droplet.user_id == current_user.id
    
    # Basic stats
    if user_filter:
        total_droplets = db.query(Droplet).filter(user_filter).count()
        active_droplets = db.query(Droplet).filter(
            user_filter,
            Droplet.status == 'active'
        ).count()
    else:
        total_droplets = db.query(Droplet).count()
        active_droplets = db.query(Droplet).filter(Droplet.status == 'active').count()
    
    # Monthly builds
    current_month_start = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if user_filter:
        monthly_builds = db.query(Droplet).filter(
            user_filter,
            Droplet.created_at >= current_month_start
        ).count()
    else:
        monthly_builds = db.query(Droplet).filter(
            Droplet.created_at >= current_month_start
        ).count()
    
    # Build success rate
    if user_filter:
        total_builds = db.query(Droplet).filter(
            user_filter,
            Droplet.created_at >= start_date
        ).count()
        
        successful_builds = db.query(Droplet).filter(
            user_filter,
            Droplet.status == 'active',
            Droplet.created_at >= start_date
        ).count()
    else:
        total_builds = db.query(Droplet).filter(
            Droplet.created_at >= start_date
        ).count()
        
        successful_builds = db.query(Droplet).filter(
            Droplet.status == 'active',
            Droplet.created_at >= start_date
        ).count()
    
    success_rate = (successful_builds / total_builds * 100) if total_builds > 0 else 0
    
    # Daily build activity
    if user_filter:
        daily_builds = db.query(
            func.date(Droplet.created_at).label('date'),
            func.count(Droplet.id).label('count')
        ).filter(
            user_filter,
            Droplet.created_at >= start_date
        ).group_by(func.date(Droplet.created_at)).all()
    else:
        daily_builds = db.query(
            func.date(Droplet.created_at).label('date'),
            func.count(Droplet.id).label('count')
        ).filter(
            Droplet.created_at >= start_date
        ).group_by(func.date(Droplet.created_at)).all()
    
    # Cost analysis
    cost_analysis = await cost_optimizer.calculate_user_costs(current_user.id, db)
    
    # Recent activity
    if user_filter:
        recent_droplets = db.query(Droplet).filter(
            user_filter
        ).order_by(Droplet.created_at.desc()).limit(5).all()
    else:
        recent_droplets = db.query(Droplet).order_by(
            Droplet.created_at.desc()
        ).limit(10).all()  # Admin gets more recent items
    
    # Cost analysis
    if current_user.is_admin():
        # For admin, get system-wide cost analysis
        cost_analysis = await cost_optimizer.calculate_system_costs(db)
    else:
        # For user, get their cost analysis
        cost_analysis = await cost_optimizer.calculate_user_costs(current_user.id, db)
    
    return {
        'overview': {
            'total_droplets': total_droplets,
            'active_droplets': active_droplets,
            'monthly_builds': monthly_builds,
            'success_rate': round(success_rate, 1),
            'quota_usage': {
                'builds': f"{monthly_builds}/{current_user.monthly_build_limit if not current_user.is_admin() else 'Unlimited'}",
                'droplets': f"{active_droplets}/{current_user.max_droplets if not current_user.is_admin() else 'Unlimited'}"
            },
            'is_admin_view': current_user.is_admin()
        },
        'costs': cost_analysis.get('current_costs', {}),
        'daily_activity': [
            {
                'date': str(day.date),
                'builds': day.count
            } for day in daily_builds
        ],
        'recent_droplets': [
            {
                'id': d.id,
                'name': d.name,
                'status': d.status,
                'created_at': d.created_at.isoformat(),
                'region': d.region,
                'size': d.size,
                'user_id': d.user_id if current_user.is_admin() else None
            } for d in recent_droplets
        ],
        'alerts': cost_analysis.get('alerts', []),
        'optimization_suggestions': cost_analysis.get('optimization_suggestions', [])
    }

@router.get("/performance")
async def get_performance_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user_or_admin)
):
    """Get detailed performance analytics - role-based access"""
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Role-based filtering
    if current_user.is_admin():
        user_filter = None
    else:
        user_filter = Droplet.user_id == current_user.id
    start_date = end_date - timedelta(days=days)
    
    # Build time analysis
    if user_filter:
        completed_builds = db.query(Droplet).filter(
            user_filter,
            Droplet.status == 'active',
            Droplet.created_at >= start_date
        ).all()
    else:
        completed_builds = db.query(Droplet).filter(
            Droplet.status == 'active',
            Droplet.created_at >= start_date
        ).all()
    
    build_times = []
    for droplet in completed_builds:
        # Mock build time calculation (in real app, track actual build times)
        build_time = 15 + (hash(droplet.name) % 20)  # 15-35 minutes
        build_times.append({
            'droplet_id': droplet.id,
            'name': droplet.name,
            'build_time_minutes': build_time,
            'template': droplet.image or 'windows-default',
            'size': droplet.size,
            'created_at': droplet.created_at.isoformat(),
            'user_id': droplet.user_id if current_user.is_admin() else None
        })
    
    avg_build_time = sum([bt['build_time_minutes'] for bt in build_times]) / len(build_times) if build_times else 0
    
    # Resource usage by template
    if user_filter:
        template_usage = db.query(
            Droplet.image,
            func.count(Droplet.id).label('count'),
            func.avg(func.extract('epoch', datetime.utcnow() - Droplet.created_at) / 3600).label('avg_runtime_hours')
        ).filter(
            user_filter,
            Droplet.created_at >= start_date
        ).group_by(Droplet.image).all()
    else:
        template_usage = db.query(
            Droplet.image,
            func.count(Droplet.id).label('count'),
            func.avg(func.extract('epoch', datetime.utcnow() - Droplet.created_at) / 3600).label('avg_runtime_hours')
        ).filter(
            Droplet.created_at >= start_date
        ).group_by(Droplet.image).all()
    
    # Region performance
    if user_filter:
        region_performance = db.query(
            Droplet.region,
            func.count(Droplet.id).label('total_builds'),
            func.sum(func.case([(Droplet.status == 'active', 1)], else_=0)).label('successful_builds')
        ).filter(
            user_filter,
            Droplet.created_at >= start_date
        ).group_by(Droplet.region).all()
    else:
        region_performance = db.query(
            Droplet.region,
            func.count(Droplet.id).label('total_builds'),
            func.sum(func.case([(Droplet.status == 'active', 1)], else_=0)).label('successful_builds')
        ).filter(
            Droplet.created_at >= start_date
        ).group_by(Droplet.region).all()
    
    return {
        'build_performance': {
            'average_build_time_minutes': round(avg_build_time, 1),
            'total_builds': len(build_times),
            'build_history': build_times
        },
        'template_usage': [
            {
                'template': usage.image or 'unknown',
                'count': usage.count,
                'avg_runtime_hours': round(float(usage.avg_runtime_hours or 0), 1)
            } for usage in template_usage
        ],
        'region_performance': [
            {
                'region': perf.region,
                'total_builds': perf.total_builds,
                'successful_builds': int(perf.successful_builds or 0),
                'success_rate': round((int(perf.successful_builds or 0) / perf.total_builds * 100), 1)
            } for perf in region_performance
        ]
    }

@router.get("/system")
async def get_system_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get system-wide analytics (admin only)"""
    
    # System metrics
    try:
        system_metrics = await monitoring_service.get_system_metrics()
    except:
        system_metrics = {}
    
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(
        User.last_login >= datetime.utcnow() - timedelta(days=30)
    ).count() if hasattr(User, 'last_login') else total_users
    
    # Admin statistics
    admin_users = db.query(User).join(User.role).filter(
        User.role.has(name="admin")
    ).count()
    
    # Droplet statistics
    total_droplets = db.query(Droplet).count()
    active_droplets = db.query(Droplet).filter(Droplet.status == 'active').count()
    building_droplets = db.query(Droplet).filter(Droplet.status == 'building').count()
    
    # Daily activity (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_activity = db.query(
        func.date(Droplet.created_at).label('date'),
        func.count(Droplet.id).label('builds'),
        func.count(func.distinct(Droplet.user_id)).label('active_users')
    ).filter(
        Droplet.created_at >= thirty_days_ago
    ).group_by(func.date(Droplet.created_at)).all()
    
    # Resource usage by region
    region_usage = db.query(
        Droplet.region,
        func.count(Droplet.id).label('total_droplets'),
        func.sum(func.case([(Droplet.status == 'active', 1)], else_=0)).label('active_droplets')
    ).group_by(Droplet.region).all()
    
    # Top users by usage
    top_users = db.query(
        User.id,
        User.email,
        User.full_name,
        func.count(Droplet.id).label('total_droplets'),
        func.sum(func.case([(Droplet.status == 'active', 1)], else_=0)).label('active_droplets')
    ).join(Droplet).group_by(User.id, User.email, User.full_name).order_by(
        func.count(Droplet.id).desc()
    ).limit(10).all()
    
    return {
        'system_metrics': system_metrics,
        'overview': {
            'total_users': total_users,
            'active_users': active_users,
            'admin_users': admin_users,
            'total_droplets': total_droplets,
            'active_droplets': active_droplets,
            'building_droplets': building_droplets,
            'utilization_rate': round((active_droplets / total_droplets * 100) if total_droplets > 0 else 0, 1)
        },
        'daily_activity': [
            {
                'date': str(day.date),
                'builds': day.builds,
                'active_users': day.active_users
            } for day in daily_activity
        ],
        'region_usage': [
            {
                'region': region.region,
                'total_droplets': region.total_droplets,
                'active_droplets': int(region.active_droplets or 0),
                'utilization_rate': round((int(region.active_droplets or 0) / region.total_droplets * 100) if region.total_droplets > 0 else 0, 1)
            } for region in region_usage
        ],
        'top_users': [
            {
                'user_id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'total_droplets': user.total_droplets,
                'active_droplets': int(user.active_droplets or 0)
            } for user in top_users
        ]
    }

@router.get("/costs")
async def get_cost_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user_or_admin)
):
    """Get detailed cost analytics - role-based access"""
    
    if current_user.is_admin():
        # Admin gets system-wide cost analysis
        try:
            cost_analysis = await cost_optimizer.calculate_system_costs(db)
        except:
            cost_analysis = {
                'current_costs': {'daily': 0, 'monthly': 0, 'projected_month': 0},
                'droplets': [],
                'optimization_suggestions': [],
                'alerts': []
            }
    else:
        # User gets their own cost analysis
        try:
            cost_analysis = await cost_optimizer.calculate_user_costs(current_user.id, db)
        except:
            cost_analysis = {
                'current_costs': {'daily': 0, 'monthly': 0, 'projected_month': 0},
                'droplets': [],
                'optimization_suggestions': [],
                'alerts': []
            }
    
    # Historical cost data (mock - in real app, store daily cost snapshots)
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    daily_costs = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        # Mock daily cost calculation
        daily_cost = cost_analysis['current_costs']['daily'] * (0.8 + (i % 5) * 0.1)
        daily_costs.append({
            'date': date.strftime('%Y-%m-%d'),
            'cost': round(daily_cost, 2)
        })
    
    return {
        'current_costs': cost_analysis['current_costs'],
        'daily_history': daily_costs,
        'droplet_breakdown': cost_analysis['droplets'],
        'optimization_suggestions': cost_analysis['optimization_suggestions'],
        'alerts': cost_analysis['alerts'],
        'projections': {
            'next_7_days': round(cost_analysis['current_costs']['daily'] * 7, 2),
            'next_30_days': round(cost_analysis['current_costs']['daily'] * 30, 2),
            'end_of_month': cost_analysis['current_costs']['projected_month']
        }
    }