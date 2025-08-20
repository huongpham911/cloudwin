#!/bin/bash

# 🌐 Apply Nginx Configuration for WinCloud
# IP: 139.99.91.108
# Domains: wincloud.app | panel.wincloud.app | api.wincloud.app

set -e

echo "🌐 Applying Nginx Configuration for WinCloud..."
echo "IP: 139.99.91.108"
echo "=================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Check if nginx is installed
if ! command -v nginx &> /dev/null; then
    print_error "Nginx is not installed!"
    echo "Run: sudo apt install nginx"
    exit 1
fi

# 1. Backup existing nginx config
echo "📄 Backing up existing nginx configuration..."
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo cp /etc/nginx/sites-enabled/default /etc/nginx/sites-enabled/default.backup
    print_status "Default config backed up"
fi

# 2. Remove default site
echo "🗑️ Removing default nginx site..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-available/default
print_status "Default site removed"

# 3. Copy our WinCloud config
echo "📝 Installing WinCloud nginx configuration..."
sudo cp configs/nginx-panel-wincloud.conf /etc/nginx/sites-available/wincloud.conf

# Enable the site
sudo ln -sf /etc/nginx/sites-available/wincloud.conf /etc/nginx/sites-enabled/wincloud.conf
print_status "WinCloud config installed and enabled"

# 4. Test nginx configuration
echo "🔍 Testing nginx configuration..."
if sudo nginx -t; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration has errors!"
    echo "Check the config file: /etc/nginx/sites-available/wincloud.conf"
    exit 1
fi

# 5. Create SSL directories if they don't exist
echo "🔐 Setting up SSL directories..."
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo chmod 755 /etc/ssl/certs
sudo chmod 700 /etc/ssl/private
print_status "SSL directories created"

# 6. Check if SSL certificates exist
if [ ! -f /etc/ssl/certs/wincloud.app.pem ]; then
    print_warning "SSL certificate not found: /etc/ssl/certs/wincloud.app.pem"
    echo "You need to create CloudFlare Origin Certificate:"
    echo "1. Go to CloudFlare Dashboard → SSL/TLS → Origin Server"
    echo "2. Create Certificate for *.wincloud.app"
    echo "3. Save certificate as: /etc/ssl/certs/wincloud.app.pem"
    echo "4. Save private key as: /etc/ssl/private/wincloud.app.key"
    echo "5. Run: sudo chmod 600 /etc/ssl/private/wincloud.app.key"
    echo ""
fi

if [ ! -f /etc/ssl/private/wincloud.app.key ]; then
    print_warning "SSL private key not found: /etc/ssl/private/wincloud.app.key"
fi

# 7. Create temporary self-signed certificate for testing (if needed)
if [ ! -f /etc/ssl/certs/wincloud.app.pem ] && [ ! -f /etc/ssl/private/wincloud.app.key ]; then
    print_warning "Creating temporary self-signed certificate for testing..."
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/wincloud.app.key \
        -out /etc/ssl/certs/wincloud.app.pem \
        -subj "/C=VN/ST=HCM/L=HCM/O=WinCloud/CN=*.wincloud.app"
    
    sudo chmod 600 /etc/ssl/private/wincloud.app.key
    sudo chmod 644 /etc/ssl/certs/wincloud.app.pem
    print_status "Temporary self-signed certificate created"
    print_warning "Replace with CloudFlare Origin Certificate for production!"
fi

# 8. Optimize nginx for 2GB VPS
echo "⚡ Optimizing nginx for 2GB VPS..."
sudo tee /etc/nginx/nginx.conf > /dev/null <<'EOF'
user www-data;
worker_processes 2;  # Match CPU cores
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;
    
    # Buffer settings for 2GB RAM
    client_body_buffer_size 128k;
    client_max_body_size 100m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # server_names_hash_bucket_size 64;
    # server_name_in_redirect off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;

    ##
    # Logging Settings
    ##
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    ##
    # Gzip Settings
    ##
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    ##
    # Rate Limiting
    ##
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

print_status "Main nginx.conf optimized"

# 9. Test configuration again
echo "🔍 Final configuration test..."
if sudo nginx -t; then
    print_status "Configuration test passed"
else
    print_error "Configuration test failed!"
    exit 1
fi

# 10. Reload nginx
echo "🔄 Reloading nginx..."
if sudo systemctl reload nginx; then
    print_status "Nginx reloaded successfully"
else
    print_error "Failed to reload nginx"
    exit 1
fi

# 11. Enable nginx to start on boot
sudo systemctl enable nginx
print_status "Nginx enabled to start on boot"

# 12. Show status
echo "📊 Nginx Status:"
sudo systemctl status nginx --no-pager -l

# 13. Show listening ports
echo ""
echo "🔌 Listening Ports:"
sudo netstat -tlnp | grep nginx

# 14. Test local connections
echo ""
echo "🧪 Testing local connections..."

# Test if ports are responding
if curl -s -o /dev/null http://localhost; then
    print_status "HTTP (80) responding"
else
    print_warning "HTTP (80) not responding"
fi

if curl -s -k -o /dev/null https://localhost; then
    print_status "HTTPS (443) responding"
else
    print_warning "HTTPS (443) not responding (SSL cert needed)"
fi

echo ""
echo "🎉 Nginx Configuration Applied!"
echo "=================================="
print_status "Nginx is configured for WinCloud"
echo ""
echo "📋 Domain Structure:"
echo "- https://wincloud.app         → Port 7000 (Landing)"
echo "- https://panel.wincloud.app   → Port 5173 (Control Panel)"  
echo "- https://api.wincloud.app     → Port 5000 (API)"
echo ""
echo "🔍 Verify configuration:"
echo "- Check config: sudo nginx -t"
echo "- Reload nginx: sudo systemctl reload nginx"
echo "- View logs: sudo tail -f /var/log/nginx/error.log"
echo ""
if [ ! -f /etc/ssl/certs/wincloud.app.pem ]; then
    print_warning "Don't forget to install CloudFlare Origin Certificate!"
fi
print_status "Ready for application deployment! 🚀"
EOF
