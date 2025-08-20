#!/usr/bin/env python3
"""
Database Migration Script for Role System
Adds role table and migrates existing users
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.core.config import settings
# Import all models to register them
from app.models import Role, User, Droplet, UserProvider, UserSession, AuditLog
import logging

# Configure registry to resolve relationships
from sqlalchemy.orm import configure_mappers
configure_mappers()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_roles_table():
    """Create roles table and seed default roles"""
    try:
        # Create engine
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("🔄 Creating roles table...")
        
        # Create all tables (including roles)
        Base.metadata.create_all(bind=engine)
        
        # Check if roles already exist
        existing_roles = session.query(Role).count()
        if existing_roles > 0:
            logger.info(f"✅ Roles table already exists with {existing_roles} roles")
            session.close()
            return
        
        # Create default roles
        logger.info("🔄 Creating default roles...")
        default_roles = Role.get_default_roles()
        
        for role_data in default_roles:
            role = Role(**role_data)
            session.add(role)
            logger.info(f"✅ Created role: {role.display_name}")
        
        session.commit()
        logger.info("✅ Default roles created successfully")
        
        session.close()
        
    except Exception as e:
        logger.error(f"❌ Error creating roles table: {e}")
        raise


def migrate_existing_users():
    """Assign default 'user' role to existing users without roles"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        logger.info("🔄 Migrating existing users...")
        
        # Get default user role
        user_role = session.query(Role).filter(Role.name == "user").first()
        if not user_role:
            logger.error("❌ Default 'user' role not found!")
            return
        
        # Find users without roles
        users_without_roles = session.query(User).filter(User.role_id.is_(None)).all()
        
        if not users_without_roles:
            logger.info("✅ All users already have roles assigned")
            session.close()
            return
        
        # Assign user role to all existing users
        for user in users_without_roles:
            user.role_id = user_role.id
            logger.info(f"✅ Assigned 'user' role to: {user.email}")
        
        session.commit()
        logger.info(f"✅ Migrated {len(users_without_roles)} users to 'user' role")
        
        session.close()
        
    except Exception as e:
        logger.error(f"❌ Error migrating users: {e}")
        raise


def verify_migration():
    """Verify the migration was successful"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Count roles
        roles_count = session.query(Role).count()
        logger.info(f"📊 Total roles: {roles_count}")
        
        # Count users by role
        users_count = session.query(User).count()
        users_with_roles = session.query(User).filter(User.role_id.isnot(None)).count()
        users_without_roles = users_count - users_with_roles
        
        logger.info(f"📊 Total users: {users_count}")
        logger.info(f"📊 Users with roles: {users_with_roles}")
        logger.info(f"📊 Users without roles: {users_without_roles}")
        
        # Show role distribution
        for role in session.query(Role).all():
            user_count = session.query(User).filter(User.role_id == role.id).count()
            logger.info(f"📊 {role.display_name}: {user_count} users")
        
        session.close()
        
        if users_without_roles == 0:
            logger.info("✅ Migration verification successful!")
            return True
        else:
            logger.warning(f"⚠️ {users_without_roles} users still without roles")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error verifying migration: {e}")
        return False


def main():
    """Run the complete migration"""
    logger.info("🚀 Starting Role System Migration...")
    
    try:
        # Step 1: Create roles table
        create_roles_table()
        
        # Step 2: Migrate existing users
        migrate_existing_users()
        
        # Step 3: Verify migration
        success = verify_migration()
        
        if success:
            logger.info("🎉 Role system migration completed successfully!")
        else:
            logger.error("❌ Migration completed with warnings")
            
    except Exception as e:
        logger.error(f"💥 Migration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
