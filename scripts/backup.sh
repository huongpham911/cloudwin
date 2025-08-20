#!/bin/bash

# WinCloud Builder Database Backup Script
# This script creates automated backups of the PostgreSQL database

set -e

# Configuration
DB_HOST=${DB_HOST:-db}
DB_NAME=${POSTGRES_DB:-wincloud_prod}
DB_USER=${POSTGRES_USER:-wincloud}
BACKUP_DIR=${BACKUP_DIR:-/backup}
RETENTION_DAYS=${RETENTION_DAYS:-7}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/wincloud_backup_$TIMESTAMP.sql"

print_info "Starting database backup..."
print_info "Database: $DB_NAME"
print_info "Host: $DB_HOST"
print_info "User: $DB_USER"
print_info "Backup file: $BACKUP_FILE"

# Create database backup
if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --verbose --clean --if-exists --create > "$BACKUP_FILE"; then
    print_status "Database backup created successfully"
    
    # Compress the backup
    if gzip "$BACKUP_FILE"; then
        print_status "Backup compressed: $BACKUP_FILE.gz"
        BACKUP_FILE="$BACKUP_FILE.gz"
    else
        print_error "Failed to compress backup, keeping uncompressed version"
    fi
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_info "Backup size: $BACKUP_SIZE"
    
else
    print_error "Database backup failed"
    exit 1
fi

# Clean up old backups
print_info "Cleaning up backups older than $RETENTION_DAYS days..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "wincloud_backup_*.sql*" -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        rm -f "$file"
        print_info "Removed old backup: $(basename "$file")"
    done
    print_status "Old backup cleanup completed"
else
    print_info "No old backups to clean up"
fi

# List remaining backups
print_info "Available backups:"
ls -lh "$BACKUP_DIR"/wincloud_backup_*.sql* 2>/dev/null | awk '{print $9, $5, $6, $7, $8}' || print_info "No backups found"

print_status "Backup process completed successfully"

# Optional: Upload to cloud storage (S3, etc.)
if [ -n "$S3_BUCKET" ]; then
    print_info "Uploading backup to S3 bucket: $S3_BUCKET"
    if command -v aws >/dev/null 2>&1; then
        aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/database-backups/" --storage-class STANDARD_IA
        print_status "Backup uploaded to S3"
    else
        print_error "AWS CLI not installed, skipping S3 upload"
    fi
fi

exit 0
