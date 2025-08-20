#!/bin/bash

# Setup SSL Certificates for WinCloud Docker Deployment
# Supports both CloudFlare Origin Certificate và Let's Encrypt

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

echo -e "${BLUE}"
echo "=========================================="
echo "  🔐 WinCloud SSL Certificate Setup"
echo "=========================================="
echo -e "${NC}"

# Create directories
mkdir -p nginx/ssl
mkdir -p nginx/html

# Check if certificates already exist
if [ -f "nginx/ssl/wincloud.app.pem" ] && [ -f "nginx/ssl/wincloud.app.key" ]; then
    print_warning "SSL certificates already exist"
    echo "Certificate info:"
    openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout | grep -E "(Subject:|DNS:|Not Before|Not After)" || true
    echo ""
    read -p "Do you want to replace them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing certificates"
        exit 0
    fi
fi

echo "Choose SSL certificate method:"
echo "1) CloudFlare Origin Certificate (Recommended for wincloud.app)"
echo "2) Let's Encrypt (Free, auto-renewal)"
echo "3) Self-signed (Development only)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        print_info "Setting up CloudFlare Origin Certificate..."
        echo ""
        echo "Please follow these steps:"
        echo "1. Go to CloudFlare Dashboard → SSL/TLS → Origin Server"
        echo "2. Click 'Create Certificate'"
        echo "3. Settings:"
        echo "   - Key Type: RSA (2048)"
        echo "   - Hostnames: *.wincloud.app, wincloud.app"
        echo "   - Certificate Validity: 15 years"
        echo "4. Click 'Create'"
        echo ""
        
        echo "Copy and paste the Origin Certificate:"
        echo "(Paste certificate, then press Ctrl+D on a new line)"
        cat > nginx/ssl/wincloud.app.pem
        
        echo ""
        echo "Copy and paste the Private Key:"
        echo "(Paste private key, then press Ctrl+D on a new line)"
        cat > nginx/ssl/wincloud.app.key
        
        # Set permissions
        chmod 644 nginx/ssl/wincloud.app.pem
        chmod 600 nginx/ssl/wincloud.app.key
        
        # Verify certificate
        if openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout >/dev/null 2>&1; then
            print_status "CloudFlare Origin Certificate installed successfully"
            
            # Show certificate info
            echo ""
            print_info "Certificate Information:"
            openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout | grep -E "(Subject:|DNS:|Not Before|Not After)"
        else
            print_error "Invalid certificate format"
            rm -f nginx/ssl/wincloud.app.pem nginx/ssl/wincloud.app.key
            exit 1
        fi
        ;;
        
    2)
        print_info "Setting up Let's Encrypt certificate..."
        
        # Check if certbot is available
        if ! command -v certbot &> /dev/null; then
            print_error "Certbot not found. Please install certbot first:"
            echo "sudo apt install certbot"
            exit 1
        fi
        
        # Create temporary nginx config for challenge
        cat > nginx/html/index.html << EOF
<!DOCTYPE html>
<html>
<head><title>WinCloud Setup</title></head>
<body><h1>WinCloud SSL Setup in Progress</h1></body>
</html>
EOF
        
        # Get certificate
        print_info "Requesting Let's Encrypt certificate..."
        sudo certbot certonly --webroot \
            -w nginx/html \
            -d wincloud.app \
            -d www.wincloud.app \
            -d panel.wincloud.app \
            -d api.wincloud.app \
            --agree-tos \
            --non-interactive \
            --register-unsafely-without-email
        
        # Copy certificates to nginx directory
        sudo cp /etc/letsencrypt/live/wincloud.app/fullchain.pem nginx/ssl/wincloud.app.pem
        sudo cp /etc/letsencrypt/live/wincloud.app/privkey.pem nginx/ssl/wincloud.app.key
        
        # Set permissions
        sudo chown $USER:$USER nginx/ssl/wincloud.app.*
        chmod 644 nginx/ssl/wincloud.app.pem
        chmod 600 nginx/ssl/wincloud.app.key
        
        print_status "Let's Encrypt certificate installed successfully"
        
        # Setup auto-renewal
        print_info "Setting up auto-renewal..."
        echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'docker-compose -f /opt/wincloud/docker-compose.nginx.yml restart nginx'" | sudo tee -a /etc/crontab
        
        print_status "Auto-renewal configured"
        ;;
        
    3)
        print_warning "Creating self-signed certificate (Development only)..."
        
        # Create self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/wincloud.app.key \
            -out nginx/ssl/wincloud.app.pem \
            -subj "/C=VN/ST=HCM/L=HoChiMinh/O=WinCloud/CN=*.wincloud.app" \
            -addext "subjectAltName=DNS:wincloud.app,DNS:*.wincloud.app,DNS:panel.wincloud.app,DNS:api.wincloud.app"
        
        # Set permissions
        chmod 644 nginx/ssl/wincloud.app.pem
        chmod 600 nginx/ssl/wincloud.app.key
        
        print_status "Self-signed certificate created"
        print_warning "This certificate is not trusted by browsers"
        ;;
        
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_status "SSL Certificate setup completed!"
echo ""
print_info "Next steps:"
echo "1. Make sure DNS is pointing to your server:"
echo "   - A record: wincloud.app → YOUR_SERVER_IP"
echo "   - A record: panel.wincloud.app → YOUR_SERVER_IP"
echo "   - A record: api.wincloud.app → YOUR_SERVER_IP"
echo ""
echo "2. Deploy WinCloud with SSL:"
echo "   ./deploy-nginx.sh setup"
echo ""
echo "3. Test your domains:"
echo "   curl -I https://wincloud.app"
echo "   curl -I https://panel.wincloud.app"
echo "   curl -I https://api.wincloud.app"
echo ""

# Test certificate
print_info "Testing certificate..."
if openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout | grep -q "wincloud.app"; then
    print_status "Certificate contains correct domain"
else
    print_warning "Certificate may not contain wincloud.app domain"
fi

print_status "Ready for deployment! 🚀"
