#!/usr/bin/env python3
"""
WinCloud Builder - System Restore Script
Restores system from backup archive
"""

import os
import shutil
import zipfile
import json
import datetime
from pathlib import Path
import sys
import glob

def list_available_backups():
    """List all available backup files"""
    backup_files = glob.glob("backups/wincloud_backup_*.zip")
    manifests = glob.glob("backups/wincloud_backup_*_manifest.json")
    
    backups = []
    for backup_file in backup_files:
        backup_name = os.path.basename(backup_file).replace('.zip', '')
        manifest_file = f"backups/{backup_name}_manifest.json"
        
        if os.path.exists(manifest_file):
            try:
                with open(manifest_file, 'r') as f:
                    manifest = json.load(f)
                backups.append({
                    "file": backup_file,
                    "manifest": manifest_file,
                    "name": backup_name,
                    "date": manifest.get("backup_date", "unknown"),
                    "size_mb": manifest.get("backup_size_mb", 0),
                    "git_branch": manifest.get("git_info", {}).get("branch", "unknown"),
                    "git_commit": manifest.get("git_info", {}).get("commit", "unknown")
                })
            except:
                backups.append({
                    "file": backup_file,
                    "manifest": None,
                    "name": backup_name,
                    "date": "unknown",
                    "size_mb": round(os.path.getsize(backup_file) / (1024*1024), 2),
                    "git_branch": "unknown",
                    "git_commit": "unknown"
                })
    
    return sorted(backups, key=lambda x: x["date"], reverse=True)

def show_backup_info(backup_info):
    """Show detailed backup information"""
    print(f"\n📦 Backup Information:")
    print("=" * 50)
    print(f"Name: {backup_info['name']}")
    print(f"Date: {backup_info['date']}")
    print(f"Size: {backup_info['size_mb']} MB")
    print(f"Git Branch: {backup_info['git_branch']}")
    print(f"Git Commit: {backup_info['git_commit'][:8]}..." if len(backup_info['git_commit']) > 8 else backup_info['git_commit'])
    
    if backup_info['manifest']:
        try:
            with open(backup_info['manifest'], 'r') as f:
                manifest = json.load(f)
            
            print(f"\n📋 Included Components:")
            for component in manifest.get("included_components", []):
                print(f"  ✅ {component}")
                
            print(f"\n🚫 Excluded Items:")
            for item in manifest.get("excluded_items", []):
                print(f"  ❌ {item}")
        except:
            pass

def create_restore_point():
    """Create a restore point before restoring"""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    restore_point = f"backups/restore_point_{timestamp}"
    
    print(f"💾 Creating restore point: {restore_point}")
    
    # Backup current state
    items_to_backup = ["backend", "frontend", "home", "README.md", "rules.md", ".cursorrules"]
    
    os.makedirs(restore_point, exist_ok=True)
    
    for item in items_to_backup:
        if os.path.exists(item):
            if os.path.isdir(item):
                shutil.copytree(item, f"{restore_point}/{item}", ignore=shutil.ignore_patterns(
                    '__pycache__', '*.pyc', 'venv', 'logs', '*.log', 'node_modules', 'dist'
                ))
            else:
                shutil.copy2(item, restore_point)
    
    return restore_point

def restore_from_backup(backup_file, create_restore_point_flag=True):
    """Restore system from backup file"""
    print(f"🔄 Restoring from: {backup_file}")
    print("=" * 60)
    
    # Create restore point
    restore_point = None
    if create_restore_point_flag:
        restore_point = create_restore_point()
    
    # Extract backup
    temp_dir = "temp_restore"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    
    print("📂 Extracting backup archive...")
    with zipfile.ZipFile(backup_file, 'r') as zipf:
        zipf.extractall(temp_dir)
    
    # Restore components
    components = {
        "backend": "Backend",
        "frontend": "Frontend", 
        "home": "Home",
        "config": "Configuration",
        "scripts": "Scripts",
        "docs": "Documentation"
    }
    
    for component, name in components.items():
        source_path = f"{temp_dir}/{component}"
        if os.path.exists(source_path):
            print(f"📁 Restoring {name}...")
            
            if component == "config":
                # Restore config files to root
                for item in os.listdir(source_path):
                    source_item = f"{source_path}/{item}"
                    if os.path.isfile(source_item):
                        shutil.copy2(source_item, ".")
            elif component == "scripts":
                # Restore scripts to backend/scripts
                if os.path.exists("backend"):
                    target_path = "backend/scripts"
                    if os.path.exists(target_path):
                        shutil.rmtree(target_path)
                    shutil.copytree(source_path, target_path)
            elif component == "docs":
                # Restore docs to backend/
                if os.path.exists("backend"):
                    for item in os.listdir(source_path):
                        source_item = f"{source_path}/{item}"
                        if os.path.isfile(source_item):
                            shutil.copy2(source_item, "backend/")
            else:
                # Restore main components
                if os.path.exists(component):
                    print(f"  🗑️ Removing existing {component}...")
                    shutil.rmtree(component)
                
                print(f"  📋 Copying {component}...")
                shutil.copytree(source_path, component)
    
    # Restore requirements files
    req_files = ["requirements.txt", "requirements-production.txt", "requirements_minimal.txt"]
    for req_file in req_files:
        source_req = f"{temp_dir}/{req_file}"
        if os.path.exists(source_req):
            shutil.copy2(source_req, f"backend/{req_file}")
    
    # Cleanup
    shutil.rmtree(temp_dir)
    
    print("\n" + "=" * 60)
    print("✅ RESTORE COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
    if restore_point:
        print(f"💾 Restore point created: {restore_point}")
        print("   (Use this to rollback if needed)")
    
    print("\n🔧 Next Steps:")
    print("1. cd backend && python -m venv venv")
    print("2. backend\\venv\\Scripts\\activate")  
    print("3. pip install -r requirements.txt")
    print("4. python run_minimal_real_api.py")
    
    if os.path.exists("frontend"):
        print("5. cd frontend && npm install")
        print("6. npm run dev")

def main():
    """Main restore function"""
    print("🔄 WinCloud Builder - System Restore")
    print("=" * 50)
    
    # List available backups
    backups = list_available_backups()
    
    if not backups:
        print("❌ No backup files found in 'backups/' directory")
        print("   Backup files should be named: wincloud_backup_YYYYMMDD_HHMMSS.zip")
        return
    
    print(f"📦 Found {len(backups)} backup(s):")
    print()
    
    for i, backup in enumerate(backups, 1):
        print(f"{i}. {backup['name']}")
        print(f"   📅 Date: {backup['date']}")
        print(f"   💾 Size: {backup['size_mb']} MB")
        print(f"   🌿 Branch: {backup['git_branch']}")
        print()
    
    # Get user selection
    try:
        choice = input(f"Select backup to restore (1-{len(backups)}) or 'q' to quit: ").strip()
        
        if choice.lower() == 'q':
            print("👋 Restore cancelled")
            return
        
        choice_idx = int(choice) - 1
        if choice_idx < 0 or choice_idx >= len(backups):
            print("❌ Invalid selection")
            return
        
        selected_backup = backups[choice_idx]
        
        # Show backup info
        show_backup_info(selected_backup)
        
        # Confirm restore
        confirm = input(f"\n⚠️ This will replace current system. Continue? (y/N): ").strip().lower()
        
        if confirm != 'y':
            print("👋 Restore cancelled")
            return
        
        # Perform restore
        restore_from_backup(selected_backup['file'])
        
    except (ValueError, KeyboardInterrupt):
        print("\n👋 Restore cancelled")
        return
    except Exception as e:
        print(f"\n❌ Restore failed: {str(e)}")
        return

if __name__ == "__main__":
    main()
