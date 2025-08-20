"""
Enhanced Database Service for WinCloud Builder
Provides optimized SQLAlchemy patterns and utilities
"""

import time
import logging
from typing import List, Dict, Any, Optional, Type, TypeVar, Generic
from functools import wraps
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_, desc, asc
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException

from app.core.database import Base

logger = logging.getLogger(__name__)

# Generic type for SQLAlchemy models
ModelType = TypeVar("ModelType", bound=Base)

class DatabaseService(Generic[ModelType]):
    """
    Enhanced database service with optimized SQLAlchemy patterns
    Provides common database operations with security and performance best practices
    """
    
    def __init__(self, model: Type[ModelType]):
        self.model = model
        self.model_name = model.__name__
    
    def track_query_performance(self, operation: str):
        """Decorator to track query execution time"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = time.time() - start_time
                    logger.info(f"✅ {operation} on {self.model_name} completed in {duration:.3f}s")
                    return result
                except Exception as e:
                    duration = time.time() - start_time
                    logger.error(f"❌ {operation} on {self.model_name} failed after {duration:.3f}s: {e}")
                    raise
            return wrapper
        return decorator
    
    @track_query_performance("GET_BY_ID")
    def get_by_id(
        self, 
        db: Session, 
        id: str, 
        eager_load: Optional[List[str]] = None
    ) -> Optional[ModelType]:
        """
        Get model by ID with optional eager loading
        
        Args:
            db: Database session
            id: Model ID
            eager_load: List of relationships to eager load
            
        Returns:
            Model instance or None
        """
        try:
            query = db.query(self.model).filter(self.model.id == id)
            
            # Add eager loading if specified
            if eager_load:
                for relationship in eager_load:
                    query = query.options(joinedload(getattr(self.model, relationship)))
            
            return query.first()
            
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_by_id for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("GET_PAGINATED")
    def get_paginated(
        self,
        db: Session,
        page: int = 1,
        per_page: int = 20,
        filters: Optional[Dict[str, Any]] = None,
        order_by: Optional[str] = None,
        order_desc: bool = False,
        eager_load: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get paginated results with filtering and sorting
        
        Args:
            db: Database session
            page: Page number (1-based)
            per_page: Items per page
            filters: Dictionary of field:value filters
            order_by: Field to order by
            order_desc: Whether to order descending
            eager_load: List of relationships to eager load
            
        Returns:
            Dictionary with items, total, page info
        """
        try:
            query = db.query(self.model)
            
            # Apply filters
            if filters:
                for field, value in filters.items():
                    if hasattr(self.model, field):
                        if isinstance(value, list):
                            query = query.filter(getattr(self.model, field).in_(value))
                        else:
                            query = query.filter(getattr(self.model, field) == value)
            
            # Add eager loading
            if eager_load:
                for relationship in eager_load:
                    if hasattr(self.model, relationship):
                        query = query.options(joinedload(getattr(self.model, relationship)))
            
            # Apply ordering
            if order_by and hasattr(self.model, order_by):
                order_field = getattr(self.model, order_by)
                if order_desc:
                    query = query.order_by(desc(order_field))
                else:
                    query = query.order_by(asc(order_field))
            
            # Get total count before pagination
            total = query.count()
            
            # Apply pagination
            offset = (page - 1) * per_page
            items = query.offset(offset).limit(per_page).all()
            
            # Calculate pagination metadata
            total_pages = (total + per_page - 1) // per_page
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_paginated for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("CREATE")
    def create(self, db: Session, **kwargs) -> ModelType:
        """
        Create new model instance
        
        Args:
            db: Database session
            **kwargs: Model fields
            
        Returns:
            Created model instance
        """
        try:
            instance = self.model(**kwargs)
            db.add(instance)
            db.commit()
            db.refresh(instance)
            
            logger.info(f"✅ Created {self.model_name} with ID: {getattr(instance, 'id', 'N/A')}")
            return instance
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in create for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("UPDATE")
    def update(
        self, 
        db: Session, 
        id: str, 
        update_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """
        Update model instance
        
        Args:
            db: Database session
            id: Model ID
            update_data: Fields to update
            
        Returns:
            Updated model instance or None
        """
        try:
            instance = self.get_by_id(db, id)
            if not instance:
                return None
            
            # Update fields
            for field, value in update_data.items():
                if hasattr(instance, field):
                    setattr(instance, field, value)
            
            # Set updated timestamp if model has it
            if hasattr(instance, 'updated_at'):
                setattr(instance, 'updated_at', func.now())
            
            db.commit()
            db.refresh(instance)
            
            logger.info(f"✅ Updated {self.model_name} with ID: {id}")
            return instance
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in update for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("DELETE")
    def delete(self, db: Session, id: str) -> bool:
        """
        Delete model instance
        
        Args:
            db: Database session
            id: Model ID
            
        Returns:
            True if deleted, False if not found
        """
        try:
            instance = self.get_by_id(db, id)
            if not instance:
                return False
            
            db.delete(instance)
            db.commit()
            
            logger.info(f"✅ Deleted {self.model_name} with ID: {id}")
            return True
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in delete for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("BULK_UPDATE")
    def bulk_update(
        self,
        db: Session,
        filters: Dict[str, Any],
        update_data: Dict[str, Any]
    ) -> int:
        """
        Bulk update multiple records
        
        Args:
            db: Database session
            filters: Conditions for records to update
            update_data: Fields to update
            
        Returns:
            Number of updated records
        """
        try:
            query = db.query(self.model)
            
            # Apply filters
            for field, value in filters.items():
                if hasattr(self.model, field):
                    if isinstance(value, list):
                        query = query.filter(getattr(self.model, field).in_(value))
                    else:
                        query = query.filter(getattr(self.model, field) == value)
            
            # Add updated timestamp
            if hasattr(self.model, 'updated_at'):
                update_data['updated_at'] = func.now()
            
            # Perform bulk update
            updated_count = query.update(update_data, synchronize_session=False)
            db.commit()
            
            logger.info(f"✅ Bulk updated {updated_count} {self.model_name} records")
            return updated_count
            
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in bulk_update for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    @track_query_performance("SEARCH")
    def search(
        self,
        db: Session,
        search_fields: List[str],
        search_term: str,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """
        Search across multiple text fields
        
        Args:
            db: Database session
            search_fields: List of fields to search in
            search_term: Search term
            page: Page number
            per_page: Items per page
            
        Returns:
            Paginated search results
        """
        try:
            query = db.query(self.model)
            
            # Build search conditions
            search_conditions = []
            for field in search_fields:
                if hasattr(self.model, field):
                    field_attr = getattr(self.model, field)
                    search_conditions.append(field_attr.ilike(f"%{search_term}%"))
            
            if search_conditions:
                query = query.filter(or_(*search_conditions))
            
            # Get total count
            total = query.count()
            
            # Apply pagination
            offset = (page - 1) * per_page
            items = query.offset(offset).limit(per_page).all()
            
            total_pages = (total + per_page - 1) // per_page
            
            return {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "search_term": search_term
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Database error in search for {self.model_name}: {e}")
            raise HTTPException(status_code=500, detail="Database error")
    
    def get_stats(self, db: Session) -> Dict[str, Any]:
        """
        Get basic statistics for the model
        
        Args:
            db: Database session
            
        Returns:
            Statistics dictionary
        """
        try:
            total_count = db.query(self.model).count()
            
            stats = {
                "total_count": total_count,
                "model_name": self.model_name
            }
            
            # Add timestamp-based stats if model has created_at
            if hasattr(self.model, 'created_at'):
                from datetime import datetime, timedelta
                
                now = datetime.utcnow()
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                week_start = now - timedelta(days=7)
                month_start = now - timedelta(days=30)
                
                today_count = db.query(self.model).filter(
                    self.model.created_at >= today_start
                ).count()
                
                week_count = db.query(self.model).filter(
                    self.model.created_at >= week_start
                ).count()
                
                month_count = db.query(self.model).filter(
                    self.model.created_at >= month_start
                ).count()
                
                stats.update({
                    "created_today": today_count,
                    "created_this_week": week_count,
                    "created_this_month": month_count
                })
            
            return stats
            
        except SQLAlchemyError as e:
            logger.error(f"Database error in get_stats for {self.model_name}: {e}")
            return {"error": str(e), "model_name": self.model_name}


# Convenience factory functions for common models
def create_user_service():
    """Create database service for User model"""
    from app.models.auth_models import User
    return DatabaseService(User)

def create_droplet_service():
    """Create database service for Droplet model"""
    from app.models.droplet import Droplet
    return DatabaseService(Droplet)

# Global service instances
user_service = create_user_service()
droplet_service = create_droplet_service()
