from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import logging

from app.core.database import get_db
from app.models.auth_models import User
from app.services.accounts_service import DigitalOceanAccountsService
from app.api.deps import get_current_user, require_admin, require_user_or_admin
from app.utils.permissions import check_role_permission

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Dict[str, Any]])
async def get_accounts(
    user_id: Optional[str] = None,
    current_user: User = Depends(require_user_or_admin),
    db: Session = Depends(get_db)
):
    """Get DigitalOcean accounts - admin can view any user's accounts"""
    try:
        # Role-based access control
        if user_id and user_id != current_user.id:
            if not current_user.is_admin():
                raise HTTPException(
                    status_code=403, 
                    detail="Chỉ admin mới có thể xem tài khoản của user khác"
                )
            target_user_id = user_id
        else:
            target_user_id = current_user.id
        
        accounts_service = DigitalOceanAccountsService(db, target_user_id)
        accounts = await accounts_service.get_accounts()
        
        # Add user context for admin view
        if current_user.is_admin() and user_id:
            target_user = db.query(User).filter(User.id == user_id).first()
            for account in accounts:
                account['user_context'] = {
                    'user_id': target_user.id,
                    'email': target_user.email,
                    'full_name': target_user.full_name
                } if target_user else None
        
        return accounts
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get accounts for user {target_user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all", response_model=List[Dict[str, Any]])
async def get_all_accounts(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Get all DigitalOcean accounts from all users"""
    try:
        all_accounts = []
        users = db.query(User).filter(User.is_active == True).all()
        
        for user in users:
            try:
                accounts_service = DigitalOceanAccountsService(db, user.id)
                user_accounts = await accounts_service.get_accounts()
                
                for account in user_accounts:
                    account['user_context'] = {
                        'user_id': user.id,
                        'email': user.email,
                        'full_name': user.full_name,
                        'role': user.get_role_name()
                    }
                    all_accounts.append(account)
            except Exception as e:
                logger.warning(f"Failed to get accounts for user {user.id}: {e}")
                continue
        
        return all_accounts
    except Exception as e:
        logger.error(f"Failed to get all accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
