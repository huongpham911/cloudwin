#!/usr/bin/env python3
"""
Create First Admin Script for WinCloud Builder
Creates the first admin user for the system
"""

import sys
import os
import getpass
import re
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models import Role, User
from app.core.security import get_password_hash
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 8:
        return False
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    
    return has_upper and has_lower and has_digit


def check_admin_exists():
    """Check if any admin user already exists"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Get admin role
        admin_role = session.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            logger.error("❌ Admin role not found! Run migrate_roles.py first.")
            session.close()
            return False, None
        
        # Check for existing admin users
        admin_count = session.query(User).filter(User.role_id == admin_role.id).count()
        session.close()
        
        return admin_count > 0, admin_count
        
    except Exception as e:
        logger.error(f"❌ Error checking admin users: {e}")
        return False, None


def create_admin_user(email: str, password: str, full_name: str = None):
    """Create a new admin user"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Get admin role
        admin_role = session.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            logger.error("❌ Admin role not found!")
            session.close()
            return False
        
        # Check if email already exists
        existing_user = session.query(User).filter(User.email == email).first()
        if existing_user:
            logger.error(f"❌ User with email {email} already exists!")
            session.close()
            return False
        
        # Generate username from email
        username = email.split('@')[0]
        base_username = username
        counter = 1
        
        # Ensure username is unique
        while session.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        # Create admin user
        admin_user = User(
            email=email,
            username=username,
            password_hash=get_password_hash(password),
            full_name=full_name or email.split('@')[0].title(),
            display_name=full_name or email.split('@')[0].title(),
            provider='local',
            is_active=True,
            is_verified=True,
            is_superuser=True,
            role_id=admin_role.id
        )
        
        session.add(admin_user)
        session.commit()
        
        logger.info(f"✅ Admin user created successfully!")
        logger.info(f"   📧 Email: {email}")
        logger.info(f"   👤 Username: {username}")
        logger.info(f"   🏷️ Full Name: {admin_user.full_name}")
        logger.info(f"   🔑 Role: {admin_role.display_name}")
        
        session.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating admin user: {e}")
        return False


def interactive_mode():
    """Interactive mode for creating admin"""
    print("\n🔧 WinCloud Builder - Create First Admin")
    print("=" * 50)
    
    # Check if admin already exists
    admin_exists, admin_count = check_admin_exists()
    if admin_exists:
        print(f"⚠️  Warning: {admin_count} admin user(s) already exist!")
        confirm = input("Do you want to create another admin? (y/N): ").lower()
        if confirm != 'y':
            print("👋 Exiting...")
            return
    
    # Get email
    while True:
        email = input("\n📧 Enter admin email: ").strip()
        if not email:
            print("❌ Email cannot be empty!")
            continue
        if not validate_email(email):
            print("❌ Invalid email format!")
            continue
        break
    
    # Get password
    while True:
        password = getpass.getpass("🔒 Enter admin password: ")
        if not password:
            print("❌ Password cannot be empty!")
            continue
        if not validate_password(password):
            print("❌ Password must be at least 8 characters with uppercase, lowercase, and digit!")
            continue
        
        confirm_password = getpass.getpass("🔒 Confirm password: ")
        if password != confirm_password:
            print("❌ Passwords do not match!")
            continue
        break
    
    # Get full name (optional)
    full_name = input("👤 Enter full name (optional): ").strip()
    if not full_name:
        full_name = email.split('@')[0].title()
    
    # Confirmation
    print(f"\n📋 Admin User Details:")
    print(f"   📧 Email: {email}")
    print(f"   👤 Full Name: {full_name}")
    
    confirm = input("\n✅ Create this admin user? (Y/n): ").lower()
    if confirm == 'n':
        print("👋 Cancelled.")
        return
    
    # Create admin
    if create_admin_user(email, password, full_name):
        print("\n🎉 Admin user created successfully!")
        print("🚀 You can now login to WinCloud Builder with admin privileges.")
    else:
        print("\n❌ Failed to create admin user.")


def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Command line mode
        if sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print("Usage:")
            print("  python create_admin.py                    # Interactive mode")
            print("  python create_admin.py --email EMAIL      # Command line mode")
            return
        
        if sys.argv[1] == "--email" and len(sys.argv) > 2:
            email = sys.argv[2]
            password = getpass.getpass("Enter admin password: ")
            full_name = None
            
            if len(sys.argv) > 3:
                full_name = sys.argv[3]
            
            if create_admin_user(email, password, full_name):
                print("✅ Admin user created successfully!")
            else:
                print("❌ Failed to create admin user.")
            return
    
    # Interactive mode
    interactive_mode()


if __name__ == "__main__":
    main()
