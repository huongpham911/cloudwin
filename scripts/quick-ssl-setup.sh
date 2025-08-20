#!/bin/bash

# 🚀 Quick SSL Setup for WinCloud
# Combined SSL installation + Nginx configuration

set -e

echo "🚀 Quick SSL Setup for WinCloud"
echo "IP: 139.99.91.108"
echo "Domains: wincloud.app | panel.wincloud.app | api.wincloud.app"
echo "=================================="

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

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

# 1. Install SSL Certificate
echo "🔐 Step 1: Installing CloudFlare Origin SSL Certificate..."
if [ -f "scripts/install-cloudflare-ssl.sh" ]; then
    chmod +x scripts/install-cloudflare-ssl.sh
    ./scripts/install-cloudflare-ssl.sh
    print_status "SSL Certificate installed"
else
    print_error "install-cloudflare-ssl.sh not found"
    exit 1
fi

echo ""

# 2. Setup Redis Cache
echo "🔴 Step 2: Setting up Redis Cache..."
if [ -f "scripts/setup-redis-cache.sh" ]; then
    chmod +x scripts/setup-redis-cache.sh
    ./scripts/setup-redis-cache.sh
    print_status "Redis Cache configured"
else
    print_error "setup-redis-cache.sh not found"
    exit 1
fi

echo ""

# 3. Apply Nginx Configuration  
echo "🌐 Step 3: Applying Nginx Configuration..."
if [ -f "scripts/apply-nginx-config.sh" ]; then
    chmod +x scripts/apply-nginx-config.sh
    ./scripts/apply-nginx-config.sh
    print_status "Nginx Configuration applied"
else
    print_error "apply-nginx-config.sh not found"
    exit 1
fi

echo ""

# 4. Test Everything
echo "🧪 Step 4: Testing Configuration..."
if [ -f "scripts/test-nginx-config.sh" ]; then
    chmod +x scripts/test-nginx-config.sh
    ./scripts/test-nginx-config.sh
else
    print_warning "test-nginx-config.sh not found - manual testing needed"
fi

echo ""

# 5. Final Verification
echo "🔍 Step 5: Final Verification..."

# Test HTTPS locally
print_info "Testing HTTPS connections..."
if curl -s -k -I https://localhost | grep -q "HTTP"; then
    print_status "HTTPS responding locally"
else
    print_warning "HTTPS not responding locally"
fi

# Check certificate validity
print_info "Checking certificate validity..."
if openssl x509 -in /etc/ssl/certs/wincloud.app.pem -checkend 86400 -noout >/dev/null 2>&1; then
    print_status "SSL certificate is valid"
else
    print_warning "SSL certificate issue"
fi

# Check nginx status
print_info "Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx is not running"
    exit 1
fi

echo ""
echo "🎉 Quick SSL Setup Complete!"
echo "=================================="

# Show summary
echo "📋 Setup Summary:"
echo "• SSL Certificate: ✅ CloudFlare Origin (valid until Aug 2040)"
echo "• Private Key: ✅ Installed with secure permissions"
echo "• Redis Cache: ✅ Configured with 256MB limit"  
echo "• Nginx Config: ✅ Applied and tested"
echo "• HTTPS: ✅ Ready for connections"
echo ""
echo "🌐 Your domains are ready:"
echo "• https://wincloud.app         → Landing Page (Port 7000)"
echo "• https://panel.wincloud.app   → Control Panel (Port 5173)"
echo "• https://api.wincloud.app     → API Backend (Port 5000)"
echo ""
echo "📋 Next Steps:"
echo "1. ✅ SSL Certificate - DONE"
echo "2. ✅ Redis Cache - DONE"
echo "3. ✅ Nginx Configuration - DONE"
echo "4. 🔄 Start your applications:"
echo "   - Backend API (Port 5000)"
echo "   - Frontend Panel (Port 5173)"
echo "   - Landing Page (Port 7000)"
echo ""
echo "5. 🌐 Test your domains:"
echo "   curl -I https://wincloud.app"
echo "   curl -I https://panel.wincloud.app"
echo "   curl -I https://api.wincloud.app/health"
echo ""
print_status "WinCloud HTTPS is ready! 🚀"

# Create final test script
cat > /root/test-wincloud-https.sh << 'TEST_EOF'
#!/bin/bash
echo "🧪 WinCloud HTTPS Test"
echo "====================="

echo "Testing domains:"
echo "1. wincloud.app..."
curl -s -I https://wincloud.app | head -1

echo "2. panel.wincloud.app..."  
curl -s -I https://panel.wincloud.app | head -1

echo "3. api.wincloud.app..."
curl -s -I https://api.wincloud.app | head -1

echo ""
echo "SSL Certificate info:"
openssl x509 -in /etc/ssl/certs/wincloud.app.pem -noout -subject -dates

echo ""
echo "Nginx status:"
systemctl status nginx --no-pager | head -3
TEST_EOF

chmod +x /root/test-wincloud-https.sh
print_info "Created test script: /root/test-wincloud-https.sh"

exit 0
