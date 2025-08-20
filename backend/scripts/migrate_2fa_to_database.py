#!/usr/bin/env python3
"""
Migration Script: File-based 2FA to Database-based 2FA
Migrates existing user 2FA data from file system to database
"""

import sys
import os
import json
import logging
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.hybrid_2fa_service import hybrid_2fa_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TwoFAMigrator:
    """Migrates 2FA data from file system to database"""
    
    def __init__(self):
        self.hybrid_service = hybrid_2fa_service
        self.migration_report = {
            "total_users": 0,
            "users_with_2fa": 0,
            "successful_migrations": 0,
            "failed_migrations": 0,
            "already_migrated": 0,
            "errors": []
        }
    
    def load_user_data(self, file_path: str = None):
        """Load user data from file or return None if using in-memory storage"""
        if file_path and os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"❌ Failed to load user data from {file_path}: {e}")
        return None
    
    def simulate_app_users(self):
        """
        Simulate app.registered_users for migration testing
        In production, this would connect to the actual running app
        """
        # This is a simulation - in production you'd connect to actual app data
        sample_users = {
            "test@example.com": {
                "user_id": "test-user-123",
                "email": "test@example.com",
                "two_factor_enabled": True,
                "two_factor_secret": "JBSWY3DPEHPK3PXP",  # Sample secret
                "backup_codes": ["1234-5678", "2345-6789", "3456-7890"],
                "backup_codes_used": ["1234-5678"],
                "migrated_to_db": False
            },
            "user2@example.com": {
                "user_id": "user-456",
                "email": "user2@example.com", 
                "two_factor_enabled": False
            }
        }
        return sample_users
    
    def migrate_all_users(self, user_data: dict = None):
        """Migrate all users with 2FA enabled"""
        if user_data is None:
            user_data = self.simulate_app_users()
            logger.info("📝 Using simulated user data for testing")
        
        self.migration_report["total_users"] = len(user_data)
        
        # Get database session
        db = next(get_db())
        
        try:
            for email, data in user_data.items():
                try:
                    self.migrate_single_user(db, email, data)
                except Exception as e:
                    logger.error(f"❌ Failed to migrate user {email}: {e}")
                    self.migration_report["failed_migrations"] += 1
                    self.migration_report["errors"].append(f"{email}: {str(e)}")
        finally:
            db.close()
        
        self.print_migration_report()
    
    def migrate_single_user(self, db: Session, email: str, user_data: dict):
        """Migrate a single user's 2FA data"""
        user_id = user_data.get("user_id")
        
        if not user_id:
            logger.warning(f"⚠️ No user_id found for {email}")
            return False
        
        # Check if user has 2FA enabled
        if not user_data.get("two_factor_enabled", False):
            logger.info(f"📝 User {email} doesn't have 2FA enabled - skipping")
            return False
        
        self.migration_report["users_with_2fa"] += 1
        
        # Check if already migrated
        if user_data.get("migrated_to_db", False):
            logger.info(f"✅ User {email} already migrated - skipping")
            self.migration_report["already_migrated"] += 1
            return True
        
        # Perform migration using hybrid service
        logger.info(f"🔄 Migrating user {email} (ID: {user_id})")
        
        # Set up hybrid service app reference (simulation)
        class MockApp:
            def __init__(self, users):
                self.registered_users = users
        
        mock_app = MockApp({email: user_data})
        self.hybrid_service.app = mock_app
        
        # Perform migration
        success = self.hybrid_service.migrate_user_to_database(db, email, user_id)
        
        if success:
            logger.info(f"✅ Successfully migrated user {email}")
            self.migration_report["successful_migrations"] += 1
            
            # Update original data to mark as migrated
            user_data["migrated_to_db"] = True
            user_data["migration_date"] = "2024-01-01T00:00:00"  # Mock date
            
        else:
            logger.error(f"❌ Failed to migrate user {email}")
            self.migration_report["failed_migrations"] += 1
        
        return success
    
    def print_migration_report(self):
        """Print detailed migration report"""
        report = self.migration_report
        
        print("\n" + "="*60)
        print("📊 2FA MIGRATION REPORT")
        print("="*60)
        print(f"📈 Total Users: {report['total_users']}")
        print(f"🔐 Users with 2FA: {report['users_with_2fa']}")
        print(f"✅ Successful Migrations: {report['successful_migrations']}")
        print(f"❌ Failed Migrations: {report['failed_migrations']}")
        print(f"🔄 Already Migrated: {report['already_migrated']}")
        
        if report['errors']:
            print(f"\n❌ ERRORS ({len(report['errors'])}):")
            for error in report['errors']:
                print(f"   • {error}")
        
        success_rate = 0
        if report['users_with_2fa'] > 0:
            success_rate = (report['successful_migrations'] / report['users_with_2fa']) * 100
        
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if report['failed_migrations'] == 0:
            print("🎉 Migration completed successfully!")
        else:
            print("⚠️ Migration completed with some errors.")
        
        print("="*60)
    
    def verify_migration(self, user_email: str, user_id: str):
        """Verify that a user's migration was successful"""
        db = next(get_db())
        try:
            status = self.hybrid_service.get_2fa_status(db, user_id, user_email)
            
            print(f"\n🔍 VERIFICATION for {user_email}:")
            print(f"   • Enabled: {status.get('enabled', False)}")
            print(f"   • System: {status.get('system', 'unknown')}")
            print(f"   • Migrated: {status.get('migrated', False)}")
            print(f"   • Backup codes: {status.get('backup_codes_remaining', 0)}")
            
            return status.get('enabled', False) and status.get('migrated', False)
        finally:
            db.close()

def main():
    """Main migration function"""
    print("🚀 Starting 2FA Migration to Database")
    print("="*60)
    
    migrator = TwoFAMigrator()
    
    # Option 1: Migrate from file (if you have a users.json file)
    # users_data = migrator.load_user_data("path/to/users.json")
    
    # Option 2: Migrate simulated data (for testing)
    users_data = None  # Will use simulated data
    
    # Perform migration
    migrator.migrate_all_users(users_data)
    
    # Verify a sample migration
    print("\n🔍 Verifying sample migration...")
    migrator.verify_migration("test@example.com", "test-user-123")

if __name__ == "__main__":
    main()
