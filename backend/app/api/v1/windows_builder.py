from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import asyncio
import os

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.droplet import Droplet, BuildProgress
from app.schemas.windows_builder import (
    WindowsBuildRequest,
    WindowsBuildResponse,
    WindowsBuildStatus,
    WindowsTemplate
)
from app.services.digitalocean import DigitalOceanService
from app.services.windows_builder import WindowsBuilderService
from app.services.websocket import manager
from app.services.cloud_init import CloudInitService
import logging
import secrets

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/build", response_model=WindowsBuildResponse)
async def create_windows_build(
    build_request: WindowsBuildRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a new Windows build process"""
    try:
        # Create droplet first
        do_service = DigitalOceanService(current_user.digital_ocean_token)
        cloud_init_service = CloudInitService()
        
        # Generate build token for webhook authentication
        build_token = secrets.token_urlsafe(32)
        
        # Generate webhook URL
        webhook_url = f"{os.getenv('API_BASE_URL', 'http://localhost:8000')}/api/v1/webhook/droplet/{build_token}"
        
        # Get SSH key from environment or user settings
        ssh_key_ids = os.getenv('DO_SSH_KEY_ID', '').split(',') if os.getenv('DO_SSH_KEY_ID') else []
        
        # Generate cloud-init user data
        user_data = cloud_init_service.generate_user_data(
            droplet_name=build_request.name,
            webhook_url=webhook_url,
            build_token=build_token
        )
        
        # Create Ubuntu droplet for building with cloud-init
        droplet_data = await do_service.create_droplet(
            name=f"winbuilder-{build_request.name}",
            region=build_request.region,
            size=build_request.size or "s-4vcpu-8gb",  # Need good specs for building
            image="ubuntu-22-04-x64",
            ssh_keys=ssh_key_ids,
            user_data=user_data
        )
        
        # Save droplet info to DB
        droplet = Droplet(
            user_id=current_user.id,
            droplet_id=droplet_data["id"],
            name=droplet_data["name"],
            region=droplet_data["region"]["slug"],
            size=droplet_data["size"]["slug"],
            image="windows-building",
            status="building",
            ip_address=None,
            created_at=datetime.utcnow()
        )
        db.add(droplet)
        db.commit()
        
        # Start build process in background
        background_tasks.add_task(
            build_windows_async,
            droplet_id=droplet.id,
            droplet_do_id=droplet_data["id"],
            build_config=build_request,
            user_id=current_user.id,
            do_token=current_user.digital_ocean_token
        )
        
        return WindowsBuildResponse(
            droplet_id=droplet.id,
            message="Windows build started",
            status="building",
            estimated_time_minutes=20
        )
        
    except Exception as e:
        logger.error(f"Failed to start Windows build: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates", response_model=List[WindowsTemplate])
async def get_windows_templates():
    """Get available Windows templates"""
    templates = [
        WindowsTemplate(
            id="win11-pro",
            name="Windows 11 Pro",
            description="Windows 11 Professional with TPM bypass",
            min_ram_gb=8,
            min_disk_gb=64,
            estimated_build_time_minutes=20
        ),
        WindowsTemplate(
            id="win11-ltsc",
            name="Windows 11 LTSC",
            description="Windows 11 Enterprise LTSC - Long-term support",
            min_ram_gb=4,
            min_disk_gb=32,
            estimated_build_time_minutes=18
        ),
        WindowsTemplate(
            id="tiny11",
            name="Tiny11",
            description="Ultra-lightweight Windows 11 (2GB RAM minimum)",
            min_ram_gb=2,
            min_disk_gb=20,
            estimated_build_time_minutes=12
        ),
        WindowsTemplate(
            id="win10-ltsc",
            name="Windows 10 LTSC",
            description="Lightweight Windows 10 for servers",
            min_ram_gb=4,
            min_disk_gb=30,
            estimated_build_time_minutes=15
        ),
        WindowsTemplate(
            id="win-server-2022",
            name="Windows Server 2022",
            description="Full Windows Server 2022",
            min_ram_gb=8,
            min_disk_gb=40,
            estimated_build_time_minutes=20
        ),
        WindowsTemplate(
            id="tiny10",
            name="Tiny10",
            description="Ultra-light Windows 10",
            min_ram_gb=2,
            min_disk_gb=20,
            estimated_build_time_minutes=10
        )
    ]
    return templates

@router.get("/build/{droplet_id}/status", response_model=WindowsBuildStatus)
async def get_build_status(
    droplet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current build status"""
    droplet = db.query(Droplet).filter(
        Droplet.id == droplet_id,
        Droplet.user_id == current_user.id
    ).first()
    
    if not droplet:
        raise HTTPException(status_code=404, detail="Build not found")
    
    # Get latest build progress
    progress = db.query(BuildProgress).filter(
        BuildProgress.droplet_id == droplet_id
    ).order_by(BuildProgress.timestamp.desc()).first()
    
    return WindowsBuildStatus(
        droplet_id=droplet_id,
        status=droplet.status,
        progress_percentage=progress.progress_percentage if progress else 0,
        current_step=progress.message if progress else "Initializing",
        ip_address=droplet.ip_address,
        rdp_port=3389 if droplet.status == "active" else None,
        logs=droplet.build_logs[-1000:] if droplet.build_logs else ""
    )

async def build_windows_async(
    droplet_id: int,
    droplet_do_id: int,
    build_config: WindowsBuildRequest,
    user_id: int,
    do_token: str
):
    """Async task to build Windows on droplet"""
    from app.core.database import SessionLocal
    db = SessionLocal()
    
    try:
        builder = WindowsBuilderService(do_token)
        do_service = DigitalOceanService(do_token)
        
        # Update progress
        await update_build_progress(db, droplet_id, 10, "Waiting for droplet to be ready")
        
        # Wait for droplet to be ready
        droplet_info = await wait_for_droplet_ready(do_service, droplet_do_id)
        ip_address = droplet_info["networks"]["v4"][0]["ip_address"]
        
        # Update droplet IP
        droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
        droplet.ip_address = ip_address
        db.commit()
        
        await update_build_progress(db, droplet_id, 20, "Installing build tools")
        
        # SSH and install Windows
        await builder.install_windows_on_droplet(
            ip_address=ip_address,
            template_id=build_config.template_id,
            username=build_config.username,
            password=build_config.password,
            progress_callback=lambda p, m: asyncio.create_task(
                update_build_progress(db, droplet_id, p, m)
            )
        )
        
        # Update final status
        droplet.status = "active"
        droplet.image = f"windows-{build_config.template_id}"
        db.commit()
        
        await update_build_progress(db, droplet_id, 100, "Windows ready! RDP available")
        
        # Send WebSocket notification
        await manager.send_to_user(
            user_id,
            {
                "type": "build_complete",
                "droplet_id": droplet_id,
                "ip_address": ip_address,
                "rdp_port": 3389
            }
        )
        
    except Exception as e:
        logger.error(f"Windows build failed: {str(e)}")
        droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
        if droplet:
            droplet.status = "error"
            droplet.build_logs += f"\nERROR: {str(e)}"
            db.commit()
    finally:
        db.close()

async def update_build_progress(db: Session, droplet_id: int, percentage: int, message: str):
    """Update build progress in DB and notify via WebSocket"""
    progress = BuildProgress(
        droplet_id=droplet_id,
        progress_percentage=percentage,
        message=message,
        timestamp=datetime.utcnow()
    )
    db.add(progress)
    
    droplet = db.query(Droplet).filter(Droplet.id == droplet_id).first()
    if droplet:
        droplet.build_logs = (droplet.build_logs or "") + f"\n[{datetime.utcnow()}] {message}"
    
    db.commit()
    
    # Send WebSocket update
    await manager.send_to_user(
        droplet.user_id,
        {
            "type": "build_progress",
            "droplet_id": droplet_id,
            "progress": percentage,
            "message": message
        }
    )

async def wait_for_droplet_ready(do_service: DigitalOceanService, droplet_id: int, timeout: int = 300):
    """Wait for droplet to be ready with IP"""
    start_time = datetime.utcnow()
    while (datetime.utcnow() - start_time).seconds < timeout:
        droplet_info = await do_service.get_droplet(droplet_id)
        if droplet_info["status"] == "active" and droplet_info["networks"]["v4"]:
            return droplet_info
        await asyncio.sleep(5)
    raise TimeoutError("Droplet failed to become ready")
