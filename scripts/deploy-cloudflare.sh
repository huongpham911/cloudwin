#!/bin/bash

# 🌩️ WinCloud Deployment Script for CloudFlare SSL
# Deploys to wincloud.app domain structure

set -e

echo "🚀 Starting WinCloud CloudFlare Deployment..."
echo "=================================="

# Configuration
DOMAIN="wincloud.app"
API_DOMAIN="api.wincloud.app"  
PANEL_DOMAIN="panel.wincloud.app"
HOME_PORT=7000
API_PORT=5000
VPS_PORT=5173

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please don't run as root"
    exit 1
fi

# 1. Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if domains resolve
echo "Checking DNS resolution..."
if ! nslookup $DOMAIN > /dev/null 2>&1; then
    print_warning "Domain $DOMAIN does not resolve yet"
fi

if ! nslookup $API_DOMAIN > /dev/null 2>&1; then
    print_warning "Domain $API_DOMAIN does not resolve yet"
fi

# Check ports availability
echo "Checking port availability..."
if netstat -tuln | grep -q ":$HOME_PORT "; then
    print_warning "Port $HOME_PORT already in use"
fi

if netstat -tuln | grep -q ":$API_PORT "; then
    print_warning "Port $API_PORT already in use"
fi

if netstat -tuln | grep -q ":$VPS_PORT "; then
    print_warning "Port $VPS_PORT already in use"
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed"
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

print_status "Dependencies checked"

# 3. Build applications
echo "🔨 Building applications..."

# Build backend
echo "Building backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

print_status "Applications built"

# 4. Create Nginx configuration
echo "🌐 Creating Nginx configuration..."

sudo tee /etc/nginx/sites-available/wincloud.conf > /dev/null <<EOF
# WinCloud CloudFlare SSL Configuration

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $API_DOMAIN $VPS_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Home/Landing Page - Port 7000
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;
    
    # SSL Configuration (CloudFlare Origin Certificate)
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:$HOME_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Host \$host;
    }
}

# API Backend - Port 5000
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;
    
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers for API
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # CORS Headers (handled by FastAPI, but backup)
    add_header Access-Control-Allow-Origin "https://$VPS_DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    
    location / {
        proxy_pass http://localhost:$API_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-API-Domain $API_DOMAIN;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://$VPS_DOMAIN";
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With";
            add_header Access-Control-Allow-Credentials "true";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}

# VPS Frontend - Port 5173  
server {
    listen 443 ssl http2;
    server_name $PANEL_DOMAIN;
    
    ssl_certificate /etc/ssl/certs/wincloud.app.pem;
    ssl_certificate_key /etc/ssl/private/wincloud.app.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    location / {
        proxy_pass http://localhost:$VPS_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # WebSocket support for Vite HMR
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/wincloud.conf /etc/nginx/sites-enabled/

# Test Nginx configuration
if sudo nginx -t; then
    print_status "Nginx configuration valid"
else
    print_error "Nginx configuration invalid"
    exit 1
fi

# 5. Create PM2 ecosystem file
echo "⚙️ Creating PM2 ecosystem..."

cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: 'wincloud-api',
      cwd: './backend',
      script: 'venv/bin/python',
      args: 'run_minimal_real_api.py',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $API_PORT,
        ENFORCE_HTTPS: 'true',
        API_DOMAIN: '$API_DOMAIN'
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
    },
    {
      name: 'wincloud-frontend',
      cwd: './frontend',
      script: 'npx',
      args: 'vite preview --host 127.0.0.1 --port $VPS_PORT',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: $VPS_PORT,
        API_BASE_URL: 'https://$API_DOMAIN'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
    }
  ]
};
EOF

# Create logs directory
mkdir -p logs

print_status "PM2 ecosystem created"

# 6. SSL Certificate setup instructions
echo "🔐 SSL Certificate Setup Instructions:"
print_warning "You need to setup CloudFlare Origin Certificate:"
echo "1. Go to CloudFlare Dashboard → SSL/TLS → Origin Server"
echo "2. Create Certificate for *.wincloud.app"
echo "3. Download certificate and private key"
echo "4. Save as:"
echo "   - /etc/ssl/certs/wincloud.app.pem"
echo "   - /etc/ssl/private/wincloud.app.key"
echo "5. Set permissions: sudo chmod 600 /etc/ssl/private/wincloud.app.key"
echo ""

# 7. Start services
echo "🚀 Starting services..."

# Start PM2 services
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Services started"

# 8. Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

print_status "Nginx reloaded"

# 9. Verify deployment
echo "🔍 Verifying deployment..."

sleep 5

# Check if services are running
if pm2 list | grep -q "wincloud-api.*online"; then
    print_status "API service running"
else
    print_error "API service not running"
fi

if pm2 list | grep -q "wincloud-frontend.*online"; then
    print_status "Frontend service running"
else
    print_error "Frontend service not running"
fi

# Test local endpoints
echo "Testing local endpoints..."
if curl -s http://localhost:$API_PORT/health > /dev/null; then
    print_status "API health check passed"
else
    print_warning "API health check failed"
fi

if curl -s http://localhost:$VPS_PORT > /dev/null; then
    print_status "Frontend health check passed"
else
    print_warning "Frontend health check failed"
fi

# 10. Final instructions
echo ""
echo "🎉 Deployment Complete!"
echo "=================================="
echo "📋 Next Steps:"
echo "1. Configure CloudFlare DNS:"
echo "   - A record: wincloud.app → YOUR_SERVER_IP"
echo "   - A record: api.wincloud.app → YOUR_SERVER_IP"  
echo "   - A record: vps.wincloud.app → YOUR_SERVER_IP"
echo ""
echo "2. Setup CloudFlare SSL Certificate (see instructions above)"
echo ""
echo "3. Test your domains:"
echo "   - https://$DOMAIN"
echo "   - https://$API_DOMAIN/health"
echo "   - https://$VPS_DOMAIN"
echo ""
echo "4. Monitor with: pm2 monit"
echo "5. View logs with: pm2 logs"
echo ""
print_status "Ready for production! 🚀"
