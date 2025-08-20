#!/usr/bin/env python3
"""
WinCloud Builder - Complete System Backup Script
Creates a comprehensive backup of the entire system
"""

import os
import shutil
import zipfile
import json
import datetime
from pathlib import Path
import subprocess
import sys

def get_timestamp():
    """Get current timestamp for backup naming"""
    return datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

def get_system_info():
    """Get system information"""
    try:
        # Get Git info
        git_branch = subprocess.run(['git', 'branch', '--show-current'], 
                                  capture_output=True, text=True, cwd='.').stdout.strip()
        git_commit = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                  capture_output=True, text=True, cwd='.').stdout.strip()
        git_status = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, cwd='.').stdout.strip()
    except:
        git_branch = "unknown"
        git_commit = "unknown" 
        git_status = "unknown"
    
    return {
        "backup_date": datetime.datetime.now().isoformat(),
        "git_branch": git_branch,
        "git_commit": git_commit,
        "git_status": git_status,
        "python_version": sys.version,
        "platform": sys.platform
    }

def create_backup():
    """Create complete system backup"""
    timestamp = get_timestamp()
    backup_name = f"wincloud_backup_{timestamp}"
    backup_dir = f"backups/{backup_name}"
    
    print(f"🚀 Creating WinCloud Builder System Backup: {backup_name}")
    print("=" * 60)
    
    # Create backup directory
    os.makedirs(backup_dir, exist_ok=True)
    
    # 1. Backend Files
    print("📁 Backing up Backend...")
    backend_backup = f"{backup_dir}/backend"
    shutil.copytree("backend", backend_backup, ignore=shutil.ignore_patterns(
        '__pycache__', '*.pyc', 'venv', 'logs', '*.log', 'wincloud.db'
    ))
    
    # 2. Frontend Files  
    if os.path.exists("frontend"):
        print("🎨 Backing up Frontend...")
        frontend_backup = f"{backup_dir}/frontend"
        shutil.copytree("frontend", frontend_backup, ignore=shutil.ignore_patterns(
            'node_modules', 'dist', 'build', '.next', '*.log'
        ))
    
    # 3. Home Files
    if os.path.exists("home"):
        print("🏠 Backing up Home...")
        home_backup = f"{backup_dir}/home"
        shutil.copytree("home", home_backup, ignore=shutil.ignore_patterns(
            'node_modules', 'dist', 'build', '.next', '*.log'
        ))
    
    # 4. Configuration Files
    print("⚙️ Backing up Configuration...")
    config_files = [
        "README.md",
        "rules.md", 
        ".cursorrules",
        ".gitignore",
        "START_WINCLOUD.bat",
        "docker-compose.yml",
        "package.json"
    ]
    
    config_backup = f"{backup_dir}/config"
    os.makedirs(config_backup, exist_ok=True)
    
    for file in config_files:
        if os.path.exists(file):
            shutil.copy2(file, config_backup)
    
    # 5. Database Schema (if exists)
    print("🗄️ Backing up Database Schema...")
    db_backup = f"{backup_dir}/database"
    os.makedirs(db_backup, exist_ok=True)
    
    if os.path.exists("backend/alembic"):
        shutil.copytree("backend/alembic", f"{db_backup}/alembic")
    
    # 6. Scripts and Tools
    print("🔧 Backing up Scripts...")
    if os.path.exists("backend/scripts"):
        shutil.copytree("backend/scripts", f"{backup_dir}/scripts")
    
    # 7. Documentation
    print("📚 Backing up Documentation...")
    docs_backup = f"{backup_dir}/docs"
    os.makedirs(docs_backup, exist_ok=True)
    
    doc_files = [
        "backend/README.md",
        "backend/TOKEN_STORAGE_ARCHITECTURE.md", 
        "backend/WINDOWS11_GUIDE.md",
        "backend/WINDOWS_VERSIONS.md",
        "backend/oauth_environment_guide.md"
    ]
    
    for doc_file in doc_files:
        if os.path.exists(doc_file):
            shutil.copy2(doc_file, docs_backup)
    
    # 8. System Information
    print("ℹ️ Saving System Information...")
    system_info = get_system_info()
    with open(f"{backup_dir}/system_info.json", 'w') as f:
        json.dump(system_info, f, indent=2)
    
    # 9. Requirements Files
    print("📦 Backing up Requirements...")
    req_files = [
        "backend/requirements.txt",
        "backend/requirements-production.txt", 
        "backend/requirements_minimal.txt"
    ]
    
    for req_file in req_files:
        if os.path.exists(req_file):
            shutil.copy2(req_file, f"{backup_dir}/")
    
    # 10. Create ZIP Archive
    print("🗜️ Creating ZIP Archive...")
    zip_filename = f"backups/{backup_name}.zip"
    
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(backup_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arc_name = os.path.relpath(file_path, backup_dir)
                zipf.write(file_path, arc_name)
    
    # 11. Create Backup Manifest
    print("📋 Creating Backup Manifest...")
    manifest = {
        "backup_name": backup_name,
        "backup_date": datetime.datetime.now().isoformat(),
        "backup_size_mb": round(os.path.getsize(zip_filename) / (1024*1024), 2),
        "included_components": [
            "Backend (Python/FastAPI)",
            "Frontend (React/Vue)", 
            "Home (Landing Page)",
            "Configuration Files",
            "Database Schema",
            "Scripts & Tools",
            "Documentation",
            "Requirements Files",
            "System Information"
        ],
        "excluded_items": [
            "__pycache__",
            "node_modules", 
            "venv",
            "logs",
            "dist/build",
            "database files",
            "temporary files"
        ],
        "git_info": {
            "branch": system_info["git_branch"],
            "commit": system_info["git_commit"],
            "status": system_info["git_status"]
        }
    }
    
    with open(f"backups/{backup_name}_manifest.json", 'w') as f:
        json.dump(manifest, f, indent=2)
    
    # 12. Cleanup temporary directory
    shutil.rmtree(backup_dir)
    
    # 13. Final Report
    print("\n" + "=" * 60)
    print("✅ BACKUP COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"📦 Backup File: {zip_filename}")
    print(f"📋 Manifest: backups/{backup_name}_manifest.json")
    print(f"💾 Size: {manifest['backup_size_mb']} MB")
    print(f"🕒 Created: {manifest['backup_date']}")
    print(f"🌿 Git Branch: {system_info['git_branch']}")
    print(f"📝 Git Commit: {system_info['git_commit'][:8]}...")
    
    return zip_filename, manifest

if __name__ == "__main__":
    try:
        # Create backups directory
        os.makedirs("backups", exist_ok=True)
        
        # Create backup
        backup_file, manifest = create_backup()
        
        print(f"\n🎉 System backup created successfully!")
        print(f"📁 Location: {backup_file}")
        
    except Exception as e:
        print(f"❌ Backup failed: {str(e)}")
        sys.exit(1)
