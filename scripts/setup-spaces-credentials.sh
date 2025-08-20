#!/bin/bash

# 🔐 Setup DigitalOcean Spaces Credentials for WinCloud Builder
# This script helps you securely configure Spaces credentials

set -e

echo "🔐 WinCloud Builder - Spaces Credentials Setup"
echo "=============================================="
echo

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if running from correct directory
if [ ! -f "backend/tokens_secure.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

echo "This script will help you configure DigitalOcean Spaces credentials."
echo "You'll need:"
echo "1. DigitalOcean API Token"
echo "2. DigitalOcean Spaces Access Key"
echo "3. DigitalOcean Spaces Secret Key"
echo

# Get DigitalOcean API Token
echo -n "Enter your DigitalOcean API Token: "
read -s DO_TOKEN
echo

if [ -z "$DO_TOKEN" ]; then
    print_error "DigitalOcean API Token is required"
    exit 1
fi

# Get Spaces Access Key
echo -n "Enter your Spaces Access Key: "
read SPACES_ACCESS_KEY

if [ -z "$SPACES_ACCESS_KEY" ]; then
    print_error "Spaces Access Key is required"
    exit 1
fi

# Get Spaces Secret Key
echo -n "Enter your Spaces Secret Key: "
read -s SPACES_SECRET_KEY
echo

if [ -z "$SPACES_SECRET_KEY" ]; then
    print_error "Spaces Secret Key is required"
    exit 1
fi

# Get region (optional)
echo -n "Enter Spaces region (default: nyc3): "
read SPACES_REGION
SPACES_REGION=${SPACES_REGION:-nyc3}

print_info "Creating secure credentials file..."

# Create tokens_secure.json
cat > backend/tokens_secure.json << EOF
{
  "tokens": [
    {
      "name": "Primary Token",
      "token": "$DO_TOKEN",
      "status": "valid",
      "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "last_used": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  ],
  "spaces_credentials": {
    "access_key": "$SPACES_ACCESS_KEY",
    "secret_key": "$SPACES_SECRET_KEY",
    "region": "$SPACES_REGION",
    "endpoint": "https://$SPACES_REGION.digitaloceanspaces.com"
  },
  "updated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Set secure permissions
chmod 600 backend/tokens_secure.json

print_status "Credentials configured successfully!"
print_warning "Make sure to keep your credentials secure and never commit them to git"

echo
echo "Next steps:"
echo "1. Restart your backend containers: docker-compose -f docker-compose.dev.yml restart backend"
echo "2. Test Spaces functionality in the WinCloud Builder dashboard"
echo

print_info "Setup complete! Your Spaces credentials are now configured."
