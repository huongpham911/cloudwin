from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import os
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.template import WindowsTemplate, UserTemplate
from app.schemas import template as schemas
from app.services.template_service import TemplateService

router = APIRouter()

@router.get("/", response_model=List[schemas.WindowsTemplateResponse])
async def list_templates(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List available Windows templates"""
    query = db.query(WindowsTemplate).filter(WindowsTemplate.is_active == True)
    
    # Filter by category or search
    if category:
        query = query.filter(WindowsTemplate.template_id.contains(category))
    if search:
        query = query.filter(WindowsTemplate.name.contains(search))
    
    # Include user's private templates
    query = query.filter(
        (WindowsTemplate.is_official == True) |
        (WindowsTemplate.created_by_user_id == current_user.id)
    )
    
    templates = query.offset(skip).limit(limit).all()
    return templates

@router.post("/", response_model=schemas.WindowsTemplateResponse)
async def create_custom_template(
    template_data: schemas.WindowsTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a custom Windows template"""
    
    # Check user limits
    user_template_count = db.query(WindowsTemplate).filter(
        WindowsTemplate.created_by_user_id == current_user.id
    ).count()
    
    if user_template_count >= current_user.max_templates:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Template limit reached. Maximum {current_user.max_templates} templates allowed."
        )
    
    # Create template
    template = WindowsTemplate(
        name=template_data.name,
        template_id=f"custom-{current_user.id}-{int(datetime.utcnow().timestamp())}",
        description=template_data.description,
        version=template_data.version,
        min_ram_gb=template_data.min_ram_gb,
        min_disk_gb=template_data.min_disk_gb,
        min_cpu_cores=template_data.min_cpu_cores,
        iso_url=template_data.iso_url,
        disk_size=template_data.disk_size,
        ram_mb=template_data.ram_mb,
        cpu_args=template_data.cpu_args,
        tpm_bypass=template_data.tpm_bypass,
        is_official=False,
        created_by_user_id=current_user.id,
        is_public=template_data.is_public
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return template

@router.post("/upload-iso")
async def upload_custom_iso(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload custom Windows ISO"""
    
    # Validate file
    if not file.filename.endswith('.iso'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ISO files are allowed"
        )
    
    # Check file size (max 10GB)
    if file.size > 10 * 1024 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum 10GB allowed."
        )
    
    # Create user upload directory
    upload_dir = f"/var/lib/wincloud/uploads/user_{current_user.id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {
        "filename": file.filename,
        "size": file.size,
        "path": file_path,
        "url": f"/uploads/user_{current_user.id}/{file.filename}"
    }

@router.get("/marketplace", response_model=List[schemas.WindowsTemplateResponse])
async def template_marketplace(
    skip: int = 0,
    limit: int = 50,
    sort_by: str = "rating",
    db: Session = Depends(get_db)
):
    """Public template marketplace"""
    
    query = db.query(WindowsTemplate).filter(
        WindowsTemplate.is_active == True,
        WindowsTemplate.is_public == True
    )
    
    # Sort options
    if sort_by == "rating":
        query = query.order_by(WindowsTemplate.rating.desc())
    elif sort_by == "downloads":
        query = query.order_by(WindowsTemplate.download_count.desc())
    elif sort_by == "newest":
        query = query.order_by(WindowsTemplate.created_at.desc())
    
    templates = query.offset(skip).limit(limit).all()
    return templates

@router.post("/{template_id}/favorite")
async def add_to_favorites(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add template to user favorites"""
    
    template = db.query(WindowsTemplate).filter(WindowsTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if already favorited
    existing = db.query(UserTemplate).filter(
        UserTemplate.user_id == current_user.id,
        UserTemplate.template_id == template_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Template already in favorites")
    
    user_template = UserTemplate(
        user_id=current_user.id,
        template_id=template_id
    )
    
    db.add(user_template)
    db.commit()
    
    return {"message": "Template added to favorites"}

@router.get("/my-templates", response_model=List[schemas.WindowsTemplateResponse])
async def my_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's custom templates and favorites"""
    
    # Custom templates
    custom_templates = db.query(WindowsTemplate).filter(
        WindowsTemplate.created_by_user_id == current_user.id
    ).all()
    
    # Favorite templates
    favorite_templates = db.query(WindowsTemplate).join(UserTemplate).filter(
        UserTemplate.user_id == current_user.id
    ).all()
    
    return {
        "custom": custom_templates,
        "favorites": favorite_templates
    }