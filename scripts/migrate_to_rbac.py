"""
Database Migration Scripts for WinCloud Builder RBAC System
Handles migration from existing system to role-based system
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.append(str(backend_path))

from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.role import Role
from backend.app.core.config import settings

class DatabaseMigrator:
    """Handle database migrations for RBAC system"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or settings.DATABASE_URL
        self.engine = create_engine(self.database_url)
        self.SessionLocal = sessionmaker(bind=self.engine)
        
    def create_backup(self):
        """Create database backup before migration"""
        print("📁 Creating database backup...")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = f"backup_before_rbac_migration_{timestamp}.sql"
        
        if "postgresql" in self.database_url:
            # PostgreSQL backup
            import subprocess
            try:
                subprocess.run([
                    "pg_dump", 
                    self.database_url,
                    "-f", backup_file
                ], check=True)
                print(f"✅ PostgreSQL backup created: {backup_file}")
                return backup_file
            except subprocess.CalledProcessError as e:
                print(f"❌ Backup failed: {e}")
                return None
                
        elif "sqlite" in self.database_url:
            # SQLite backup (simple file copy)
            import shutil
            db_file = self.database_url.replace("sqlite:///", "")
            backup_path = f"{db_file}.backup_{timestamp}"
            try:
                shutil.copy2(db_file, backup_path)
                print(f"✅ SQLite backup created: {backup_path}")
                return backup_path
            except Exception as e:
                print(f"❌ Backup failed: {e}")
                return None
        else:
            print("⚠️ Unknown database type, backup skipped")
            return None
    
    def check_existing_tables(self):
        """Check what tables already exist"""
        print("🔍 Checking existing database structure...")
        
        db = self.SessionLocal()
        try:
            # Check if users table exists
            users_exists = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='users'
            """)).fetchone() if "sqlite" in self.database_url else db.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_name = 'users'
            """)).fetchone()
            
            # Check if roles table exists
            roles_exists = db.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='roles'
            """)).fetchone() if "sqlite" in self.database_url else db.execute(text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_name = 'roles'
            """)).fetchone()
            
            # Check if users have role_id column
            has_role_id = False
            if users_exists:
                try:
                    db.execute(text("SELECT role_id FROM users LIMIT 1"))
                    has_role_id = True
                except Exception:
                    pass
            
            return {
                "users_exists": bool(users_exists),
                "roles_exists": bool(roles_exists),
                "has_role_id": has_role_id
            }
            
        finally:
            db.close()
    
    def create_roles_table(self):
        """Create roles table"""
        print("📋 Creating roles table...")
        
        db = self.SessionLocal()
        try:
            # Create roles table
            Role.__table__.create(self.engine, checkfirst=True)
            
            # Insert default roles
            admin_role = Role(
                id="admin-role-default",
                name="admin",
                display_name="Administrator",
                description="Full system access with all permissions",
                permissions=["all"]
            )
            
            user_role = Role(
                id="user-role-default",
                name="user", 
                display_name="User",
                description="Standard user with limited permissions",
                permissions=[
                    "read_own_droplets",
                    "create_droplets", 
                    "manage_own_droplets",
                    "manage_own_profile",
                    "view_own_analytics"
                ]
            )
            
            db.add(admin_role)
            db.add(user_role)
            db.commit()
            
            print("✅ Roles table created with default roles")
            return True
            
        except SQLAlchemyError as e:
            print(f"❌ Failed to create roles table: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def add_role_id_to_users(self):
        """Add role_id column to existing users table"""
        print("👥 Adding role_id column to users table...")
        
        db = self.SessionLocal()
        try:
            # Add role_id column (nullable initially)
            if "sqlite" in self.database_url:
                # SQLite doesn't support ALTER COLUMN, need to recreate table
                self.migrate_sqlite_users_table(db)
            else:
                # PostgreSQL/MySQL can add column directly
                db.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN role_id VARCHAR(36) 
                    REFERENCES roles(id)
                """))
                db.commit()
            
            print("✅ role_id column added to users table")
            return True
            
        except SQLAlchemyError as e:
            print(f"❌ Failed to add role_id column: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def migrate_sqlite_users_table(self, db):
        """Migrate SQLite users table to include role_id"""
        print("  📝 Migrating SQLite users table...")
        
        # Get existing users data
        existing_users = db.execute(text("SELECT * FROM users")).fetchall()
        
        # Rename old table
        db.execute(text("ALTER TABLE users RENAME TO users_old"))
        
        # Create new users table with role_id
        User.__table__.create(db.bind, checkfirst=True)
        
        # Get default user role ID
        user_role = db.query(Role).filter(Role.name == "user").first()
        default_role_id = user_role.id if user_role else None
        
        # Migrate data
        for user_data in existing_users:
            # Convert row to dict
            user_dict = dict(user_data._mapping)
            user_dict['role_id'] = default_role_id
            
            # Insert into new table
            columns = ', '.join(user_dict.keys())
            placeholders = ', '.join([f":{key}" for key in user_dict.keys()])
            
            db.execute(text(f"""
                INSERT INTO users ({columns}) 
                VALUES ({placeholders})
            """), user_dict)
        
        # Drop old table
        db.execute(text("DROP TABLE users_old"))
        db.commit()
    
    def assign_default_roles(self):
        """Assign default roles to existing users"""
        print("🎭 Assigning default roles to existing users...")
        
        db = self.SessionLocal()
        try:
            # Get default user role
            user_role = db.query(Role).filter(Role.name == "user").first()
            if not user_role:
                print("❌ Default user role not found")
                return False
            
            # Update users without role_id
            updated = db.execute(text("""
                UPDATE users 
                SET role_id = :role_id 
                WHERE role_id IS NULL
            """), {"role_id": user_role.id}).rowcount
            
            db.commit()
            print(f"✅ Assigned default role to {updated} users")
            return True
            
        except SQLAlchemyError as e:
            print(f"❌ Failed to assign default roles: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def create_first_admin(self, username: str, email: str, password: str):
        """Create first admin user"""
        print("👑 Creating first admin user...")
        
        db = self.SessionLocal()
        try:
            # Check if admin already exists
            existing_admin = db.query(User).join(Role).filter(Role.name == "admin").first()
            if existing_admin:
                print(f"⚠️ Admin user already exists: {existing_admin.username}")
                return True
            
            # Get admin role
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if not admin_role:
                print("❌ Admin role not found")
                return False
            
            # Hash password
            from backend.app.core.security import get_password_hash
            hashed_password = get_password_hash(password)
            
            # Create admin user
            admin_user = User(
                id=f"admin-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                username=username,
                email=email,
                hashed_password=hashed_password,
                role_id=admin_role.id,
                is_active=True
            )
            
            db.add(admin_user)
            db.commit()
            
            print(f"✅ Admin user created: {username}")
            return True
            
        except SQLAlchemyError as e:
            print(f"❌ Failed to create admin user: {e}")
            db.rollback()
            return False
        finally:
            db.close()
    
    def validate_migration(self):
        """Validate migration was successful"""
        print("✅ Validating migration...")
        
        db = self.SessionLocal()
        try:
            # Check roles exist
            roles_count = db.query(Role).count()
            print(f"  📋 Roles in database: {roles_count}")
            
            # Check users have roles
            users_with_roles = db.query(User).filter(User.role_id.isnot(None)).count()
            users_without_roles = db.query(User).filter(User.role_id.is_(None)).count()
            
            print(f"  👥 Users with roles: {users_with_roles}")
            print(f"  👥 Users without roles: {users_without_roles}")
            
            # Check admin exists
            admin_count = db.query(User).join(Role).filter(Role.name == "admin").count()
            print(f"  👑 Admin users: {admin_count}")
            
            if roles_count >= 2 and users_without_roles == 0 and admin_count >= 1:
                print("✅ Migration validation passed")
                return True
            else:
                print("❌ Migration validation failed")
                return False
                
        finally:
            db.close()
    
    def run_migration(self, admin_username: str = "admin", admin_email: str = "admin@wincloud.com", admin_password: str = "SecureAdmin123!"):
        """Run complete migration process"""
        print("🚀 Starting RBAC Migration Process")
        print("=" * 50)
        
        # Step 1: Create backup
        backup_file = self.create_backup()
        if not backup_file:
            print("⚠️ Proceeding without backup (not recommended for production)")
        
        # Step 2: Check existing structure
        structure = self.check_existing_tables()
        print(f"📊 Database structure: {structure}")
        
        # Step 3: Create/update tables
        if not structure["roles_exists"]:
            if not self.create_roles_table():
                print("❌ Migration failed at roles table creation")
                return False
        
        if not structure["has_role_id"]:
            if not self.add_role_id_to_users():
                print("❌ Migration failed at adding role_id column")
                return False
        
        # Step 4: Assign default roles
        if not self.assign_default_roles():
            print("❌ Migration failed at role assignment")
            return False
        
        # Step 5: Create admin user
        if not self.create_first_admin(admin_username, admin_email, admin_password):
            print("❌ Migration failed at admin user creation")
            return False
        
        # Step 6: Validate
        if not self.validate_migration():
            print("❌ Migration validation failed")
            return False
        
        print("\n🎉 RBAC Migration Completed Successfully!")
        print("=" * 50)
        print(f"👑 Admin user: {admin_username}")
        print(f"📧 Admin email: {admin_email}")
        print(f"🔑 Admin password: {admin_password}")
        print("\n⚠️ Please change the admin password after first login!")
        
        if backup_file:
            print(f"📁 Backup file: {backup_file}")
        
        return True

def main():
    """Main migration entry point"""
    print("WinCloud Builder - RBAC Database Migration")
    print("=" * 50)
    
    # Get database URL from environment or use default
    import os
    database_url = os.getenv("DATABASE_URL", "sqlite:///./wincloud.db")
    
    print(f"🗄️ Database: {database_url}")
    
    # Get admin credentials from environment or use defaults
    admin_username = os.getenv("ADMIN_USERNAME", "admin")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@wincloud.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "SecureAdmin123!")
    
    # Create migrator and run
    migrator = DatabaseMigrator(database_url)
    
    try:
        success = migrator.run_migration(admin_username, admin_email, admin_password)
        if success:
            print("\n✅ Migration completed successfully!")
            return 0
        else:
            print("\n❌ Migration failed!")
            return 1
            
    except Exception as e:
        print(f"\n💥 Migration error: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
