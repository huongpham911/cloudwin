#!/bin/bash

# WinCloud Builder - Production Environment Setup
# Chạy sau khi đã clone project

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BLUE}"
echo "=============================================="
echo "  🔧 Production Environment Configuration"
echo "=============================================="
echo -e "${NC}"

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found. Are you in the project directory?"
    exit 1
fi

# Get VPS IP address
VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip)
print_info "Detected VPS IP: $VPS_IP"

# Get domain name from user
echo
read -p "🌐 Enter your domain name (or press Enter to use IP only): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    DOMAIN_NAME=$VPS_IP
    print_warning "Using IP address as domain: $VPS_IP"
else
    print_info "Using domain: $DOMAIN_NAME"
fi

# Generate secure passwords
print_info "Generating secure passwords..."
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create production .env file
print_info "Creating production .env file..."
cat > .env << EOF
# WinCloud Builder - Production Configuration
# Generated on $(date)

# =============================================================================
# PRODUCTION SETTINGS
# =============================================================================

# Application Settings
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BCRYPT_ROUNDS=12

# Environment
DEBUG=false
ENVIRONMENT=production

# Database Configuration (Production)
POSTGRES_USER=wincloud
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=wincloud_prod
POSTGRES_PORT=5432
DATABASE_URL=postgresql://wincloud:$POSTGRES_PASSWORD@db:5432/wincloud_prod

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_PORT=6379
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379/0

# Server Configuration
BACKEND_PORT=5000
FRONTEND_PORT=80
DOMAIN=$DOMAIN_NAME

# CORS Settings (Production)
BACKEND_CORS_ORIGINS=["https://$DOMAIN_NAME","http://$DOMAIN_NAME","http://$VPS_IP","https://$VPS_IP"]

# DigitalOcean Configuration
DO_SSH_KEY_ID=your-ssh-key-id-from-digitalocean
SSH_KEY_PATH=/var/www/wincloud/keys/id_rsa

# Windows ISO URLs (Update these with your actual URLs)
WIN11_PRO_ISO_URL=https://your-iso-storage.com/Win11_Pro.iso
WIN11_LTSC_ISO_URL=https://your-iso-storage.com/Win11_LTSC.iso
TINY11_ISO_URL=https://your-iso-storage.com/Tiny11.iso
WIN10_LTSC_ISO_URL=https://your-iso-storage.com/Win10_LTSC.iso
TINY10_ISO_URL=https://your-iso-storage.com/Tiny10.iso
WIN_SERVER_2022_ISO_URL=https://your-iso-storage.com/WinServer2022.iso

# TinyInstaller Settings
USE_TINYINSTALLER=true
TINYINSTALLER_URL=https://your-storage.com/tinyinstaller.exe

# Email Configuration (Optional - configure if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_EMAIL=noreply@$DOMAIN_NAME
EMAILS_FROM_NAME=WinCloud Builder

# OAuth Settings (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
OAUTH_REDIRECT_URL=https://$DOMAIN_NAME/auth/callback

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/wincloud/app.log
EOF

print_status "Production .env file created"

# Create tokens_secure.json template if not exists
if [ ! -f "backend/tokens_secure.json" ]; then
    print_info "Creating tokens_secure.json template..."
    cat > backend/tokens_secure.json << EOF
{
  "users": {
    "admin_user": {
      "tokens": [
        {
          "encrypted_token": "REPLACE_WITH_ENCRYPTED_TOKEN",
          "salt": "REPLACE_WITH_SALT",
          "fingerprint": "REPLACE_WITH_FINGERPRINT",
          "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%6N)",
          "last_used": null,
          "usage_count": 0,
          "is_valid": true,
          "name": "Primary Token"
        }
      ],
      "created_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%6N)",
      "total_tokens": 1,
      "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%S.%6N)"
    }
  },
  "last_updated": "$(date -u +%Y-%m-%dT%H:%M:%S.%6N)",
  "version": "2.0",
  "encryption": "AES-256-Fernet-PBKDF2"
}
EOF
    print_warning "⚠️  Please use the secure token management system to add your DigitalOcean API tokens!"
fi

# Create SSH keys directory
print_info "Creating SSH keys directory..."
mkdir -p keys
chmod 700 keys

# Create logs directory
print_info "Creating logs directory..."
sudo mkdir -p /var/log/wincloud
sudo chown wincloud:wincloud /var/log/wincloud

# Set proper permissions
print_info "Setting file permissions..."
chmod 600 .env
chmod 600 backend/tokens.json 2>/dev/null || true

print_status "Production environment configuration completed!"
echo
print_info "📋 Configuration Summary:"
echo "  🌐 Domain: $DOMAIN_NAME"
echo "  🔐 Secret Key: Generated (64 chars)"
echo "  🗄️  Database Password: Generated"
echo "  🔴 Redis Password: Generated"
echo "  📁 Project Path: $(pwd)"
echo
print_warning "⚠️  Important: Please update the following before deployment:"
echo "  1. Edit backend/tokens.json with your DigitalOcean API tokens"
echo "  2. Update Windows ISO URLs in .env file"
echo "  3. Configure email settings if needed"
echo "  4. Add your SSH keys to keys/ directory"
echo
print_info "Next step: Run './deploy.sh production' to deploy"
EOF






