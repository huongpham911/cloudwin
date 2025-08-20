"""
Default Admin Account Setup for WinCloud Builder
Creates first admin account for fresh installations
"""

import sys
import os
import getpass
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

try:
    from backend.app.models.user import User
    from backend.app.models.role import Role
    from backend.app.core.database import SessionLocal
    from backend.app.core.security import get_password_hash
    from sqlalchemy.exc import IntegrityError
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please ensure you're running this from the project root directory")
    sys.exit(1)

class AdminSetup:
    """Handle admin account setup"""
    
    def __init__(self):
        self.db = SessionLocal()
    
    def check_admin_role_exists(self):
        """Check if admin role exists"""
        admin_role = self.db.query(Role).filter(Role.name == "admin").first()
        return admin_role is not None
    
    def create_admin_role(self):
        """Create admin role if it doesn't exist"""
        print("📋 Creating admin role...")
        
        admin_role = Role(
            id=f"admin-role-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            name="admin",
            display_name="Administrator", 
            description="Full system access with all administrative permissions",
            permissions=["all"]  # Admin has all permissions
        )
        
        try:
            self.db.add(admin_role)
            self.db.commit()
            print("✅ Admin role created successfully")
            return admin_role
        except IntegrityError:
            self.db.rollback()
            print("⚠️ Admin role already exists")
            return self.db.query(Role).filter(Role.name == "admin").first()
    
    def check_existing_admins(self):
        """Check if any admin users already exist"""
        admin_count = (self.db.query(User)
                      .join(Role)
                      .filter(Role.name == "admin")
                      .count())
        return admin_count
    
    def get_admin_details(self, interactive=True):
        """Get admin user details from user input or environment"""
        if interactive:
            print("\n👑 Setting up first admin account")
            print("=" * 40)
            
            username = input("Enter admin username [admin]: ").strip() or "admin"
            
            while True:
                email = input("Enter admin email: ").strip()
                if email and "@" in email:
                    break
                print("❌ Please enter a valid email address")
            
            while True:
                password = getpass.getpass("Enter admin password: ").strip()
                if len(password) >= 8:
                    confirm_password = getpass.getpass("Confirm admin password: ").strip()
                    if password == confirm_password:
                        break
                    else:
                        print("❌ Passwords do not match")
                else:
                    print("❌ Password must be at least 8 characters long")
            
            return username, email, password
        else:
            # Non-interactive mode - use environment variables
            username = os.getenv("ADMIN_USERNAME", "admin")
            email = os.getenv("ADMIN_EMAIL")
            password = os.getenv("ADMIN_PASSWORD")
            
            if not email:
                raise ValueError("ADMIN_EMAIL environment variable is required")
            if not password:
                raise ValueError("ADMIN_PASSWORD environment variable is required")
            
            return username, email, password
    
    def create_admin_user(self, username, email, password, role_id):
        """Create admin user"""
        print(f"👤 Creating admin user: {username}")
        
        # Check if username already exists
        existing_user = self.db.query(User).filter(User.username == username).first()
        if existing_user:
            print(f"❌ Username '{username}' already exists")
            return None
        
        # Check if email already exists
        existing_email = self.db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"❌ Email '{email}' already exists")
            return None
        
        # Hash password
        hashed_password = get_password_hash(password)
        
        # Create user
        admin_user = User(
            id=f"admin-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            username=username,
            email=email,
            hashed_password=hashed_password,
            role_id=role_id,
            is_active=True
        )
        
        try:
            self.db.add(admin_user)
            self.db.commit()
            print("✅ Admin user created successfully")
            return admin_user
        except IntegrityError as e:
            self.db.rollback()
            print(f"❌ Failed to create admin user: {e}")
            return None
    
    def setup_admin(self, interactive=True):
        """Complete admin setup process"""
        print("🚀 WinCloud Builder - Admin Setup")
        print("=" * 40)
        
        try:
            # Check if admin role exists
            if not self.check_admin_role_exists():
                admin_role = self.create_admin_role()
                if not admin_role:
                    print("❌ Failed to create admin role")
                    return False
            else:
                admin_role = self.db.query(Role).filter(Role.name == "admin").first()
                print("✅ Admin role already exists")
            
            # Check existing admins
            existing_admins = self.check_existing_admins()
            if existing_admins > 0:
                print(f"⚠️ {existing_admins} admin user(s) already exist")
                
                if interactive:
                    choice = input("Do you want to create another admin? (y/N): ").strip().lower()
                    if choice != 'y':
                        print("👋 Admin setup cancelled")
                        return True
                else:
                    print("👋 Admin setup skipped - admins already exist")
                    return True
            
            # Get admin details
            username, email, password = self.get_admin_details(interactive)
            
            # Create admin user
            admin_user = self.create_admin_user(username, email, password, admin_role.id)
            
            if admin_user:
                print("\n🎉 Admin setup completed successfully!")
                print("=" * 40)
                print(f"👤 Username: {username}")
                print(f"📧 Email: {email}")
                print(f"🔑 Password: {'*' * len(password)}")
                print("\n🛡️ Security recommendations:")
                print("  • Change the password after first login")
                print("  • Enable two-factor authentication if available")
                print("  • Use a strong, unique password")
                print("  • Regularly review admin access logs")
                return True
            else:
                print("❌ Admin setup failed")
                return False
                
        except Exception as e:
            print(f"💥 Setup error: {e}")
            return False
        finally:
            self.db.close()

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup first admin account for WinCloud Builder")
    parser.add_argument("--non-interactive", action="store_true", 
                       help="Run in non-interactive mode using environment variables")
    parser.add_argument("--username", help="Admin username (interactive mode)")
    parser.add_argument("--email", help="Admin email (interactive mode)")
    parser.add_argument("--password", help="Admin password (interactive mode)")
    
    args = parser.parse_args()
    
    # Check if running from correct directory
    if not (Path.cwd() / "backend" / "app").exists():
        print("❌ Please run this script from the project root directory")
        print("Current directory:", Path.cwd())
        return 1
    
    setup = AdminSetup()
    
    if args.non_interactive:
        print("🤖 Running in non-interactive mode...")
        success = setup.setup_admin(interactive=False)
    else:
        # Check if credentials provided via arguments
        if args.username and args.email and args.password:
            # Set environment variables for non-interactive mode
            os.environ["ADMIN_USERNAME"] = args.username
            os.environ["ADMIN_EMAIL"] = args.email
            os.environ["ADMIN_PASSWORD"] = args.password
            success = setup.setup_admin(interactive=False)
        else:
            success = setup.setup_admin(interactive=True)
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
