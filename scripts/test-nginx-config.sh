#!/bin/bash

# 🔍 Test Nginx Configuration for WinCloud
# Quick test script to verify nginx setup

echo "🔍 Testing Nginx Configuration..."
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

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# 1. Check if nginx is installed and running
echo "1. Checking Nginx Status..."
if command -v nginx &> /dev/null; then
    print_status "Nginx is installed"
    
    if systemctl is-active --quiet nginx; then
        print_status "Nginx is running"
    else
        print_warning "Nginx is not running"
        echo "   Run: sudo systemctl start nginx"
    fi
else
    print_error "Nginx is not installed"
    echo "   Run: sudo apt install nginx"
    exit 1
fi

echo ""

# 2. Test configuration syntax
echo "2. Testing Configuration Syntax..."
if sudo nginx -t 2>&1; then
    print_status "Configuration syntax is valid"
else
    print_error "Configuration syntax has errors"
    exit 1
fi

echo ""

# 3. Check if our config is enabled
echo "3. Checking WinCloud Configuration..."
if [ -f /etc/nginx/sites-available/wincloud.conf ]; then
    print_status "WinCloud config exists"
    
    if [ -L /etc/nginx/sites-enabled/wincloud.conf ]; then
        print_status "WinCloud config is enabled"
    else
        print_warning "WinCloud config is not enabled"
        echo "   Run: sudo ln -sf /etc/nginx/sites-available/wincloud.conf /etc/nginx/sites-enabled/"
    fi
else
    print_error "WinCloud config not found"
    echo "   Run the apply-nginx-config.sh script first"
    exit 1
fi

echo ""

# 4. Check SSL certificates
echo "4. Checking SSL Certificates..."
if [ -f /etc/ssl/certs/wincloud.app.pem ]; then
    print_status "SSL certificate exists"
    
    # Check certificate details
    cert_info=$(openssl x509 -in /etc/ssl/certs/wincloud.app.pem -text -noout 2>/dev/null || echo "Invalid certificate")
    if echo "$cert_info" | grep -q "wincloud.app"; then
        print_status "Certificate is for wincloud.app"
    else
        print_warning "Certificate might not be for wincloud.app"
    fi
    
    # Check expiration
    if openssl x509 -checkend 86400 -noout -in /etc/ssl/certs/wincloud.app.pem >/dev/null 2>&1; then
        print_status "Certificate is valid (not expiring within 24h)"
    else
        print_warning "Certificate expires within 24 hours or is invalid"
    fi
else
    print_warning "SSL certificate not found"
    echo "   Create CloudFlare Origin Certificate or temporary self-signed cert"
fi

if [ -f /etc/ssl/private/wincloud.app.key ]; then
    print_status "SSL private key exists"
    
    # Check key permissions
    key_perms=$(stat -c "%a" /etc/ssl/private/wincloud.app.key)
    if [ "$key_perms" = "600" ]; then
        print_status "Private key has correct permissions (600)"
    else
        print_warning "Private key permissions should be 600"
        echo "   Run: sudo chmod 600 /etc/ssl/private/wincloud.app.key"
    fi
else
    print_warning "SSL private key not found"
fi

echo ""

# 5. Check listening ports
echo "5. Checking Listening Ports..."
if netstat -tlnp 2>/dev/null | grep -q ":80.*nginx"; then
    print_status "Nginx listening on port 80 (HTTP)"
else
    print_warning "Nginx not listening on port 80"
fi

if netstat -tlnp 2>/dev/null | grep -q ":443.*nginx"; then
    print_status "Nginx listening on port 443 (HTTPS)"
else
    print_warning "Nginx not listening on port 443"
fi

echo ""

# 6. Test local HTTP/HTTPS connections
echo "6. Testing Local Connections..."

# Test HTTP
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "301\|200"; then
    print_status "HTTP connection working (should redirect to HTTPS)"
else
    print_warning "HTTP connection not working"
fi

# Test HTTPS with self-signed cert
if curl -s -k -o /dev/null -w "%{http_code}" https://localhost | grep -q "200\|502\|503"; then
    print_status "HTTPS connection working (backend may not be running)"
else
    print_warning "HTTPS connection not working"
fi

echo ""

# 7. Check backend services (if running)
echo "7. Checking Backend Services..."

# Check if backend ports are open
backend_ports=(5000 5173 7000)
for port in "${backend_ports[@]}"; do
    if netstat -tln 2>/dev/null | grep -q ":$port "; then
        print_status "Backend service running on port $port"
    else
        print_info "Backend service not running on port $port"
    fi
done

echo ""

# 8. Check nginx error logs for recent issues
echo "8. Checking Recent Nginx Logs..."
if [ -f /var/log/nginx/error.log ]; then
    recent_errors=$(sudo tail -10 /var/log/nginx/error.log | grep -i error | wc -l)
    if [ "$recent_errors" -eq 0 ]; then
        print_status "No recent errors in nginx logs"
    else
        print_warning "$recent_errors recent errors found in nginx logs"
        echo "   Check: sudo tail -20 /var/log/nginx/error.log"
    fi
else
    print_warning "Nginx error log not found"
fi

echo ""

# 9. Test domain resolution (if DNS is configured)
echo "9. Testing Domain Resolution..."
domains=("wincloud.app" "panel.wincloud.app" "api.wincloud.app")

for domain in "${domains[@]}"; do
    if nslookup "$domain" >/dev/null 2>&1; then
        ip=$(dig +short "$domain" | head -1)
        if [ "$ip" = "139.99.91.108" ]; then
            print_status "$domain resolves to correct IP (139.99.91.108)"
        else
            print_info "$domain resolves to $ip (expected: 139.99.91.108)"
        fi
    else
        print_info "$domain does not resolve yet (DNS not configured)"
    fi
done

echo ""

# 10. Configuration summary
echo "10. Configuration Summary..."
echo "────────────────────────────────────────"
print_info "Server IP: 139.99.91.108"
print_info "Domain Structure:"
echo "   - wincloud.app         → Port 7000 (Landing)"
echo "   - panel.wincloud.app   → Port 5173 (Control Panel)"
echo "   - api.wincloud.app     → Port 5000 (API Backend)"

echo ""
print_info "SSL Configuration:"
if [ -f /etc/ssl/certs/wincloud.app.pem ]; then
    echo "   - Certificate: ✅ Present"
else
    echo "   - Certificate: ❌ Missing"
fi

if [ -f /etc/ssl/private/wincloud.app.key ]; then
    echo "   - Private Key: ✅ Present"
else
    echo "   - Private Key: ❌ Missing"
fi

echo ""
print_info "Next Steps:"
if [ ! -f /etc/ssl/certs/wincloud.app.pem ]; then
    echo "   1. Install CloudFlare Origin Certificate"
fi
echo "   2. Start backend applications (PM2)"
echo "   3. Configure CloudFlare DNS records"
echo "   4. Test domain access"

echo ""
echo "🎉 Nginx Test Complete!"
echo "=================================="

# Return appropriate exit code
if sudo nginx -t >/dev/null 2>&1; then
    print_status "Overall: Configuration looks good! 🚀"
    exit 0
else
    print_error "Overall: Configuration needs attention! ⚠️"
    exit 1
fi
