#!/bin/bash

# 🚀 WinCloud Setup Script for 2GB VPS
# Optimized for 2 Core, 2GB RAM, 40GB SSD
# IP: 139.99.91.108

set -e

echo "🚀 Setting up WinCloud on 2GB VPS..."
echo "IP: 139.99.91.108"
echo "Domains: wincloud.app | panel.wincloud.app | api.wincloud.app"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
if [ "$EUID" -eq 0 ]; then 
    print_error "Please don't run as root"
    exit 1
fi

# 1. System optimization for 2GB RAM
echo "🔧 Optimizing system for 2GB RAM..."

# Create swap file (recommended for low RAM)
if [ ! -f /swapfile ]; then
    print_info "Creating 2GB swap file..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "Swap file created"
else
    print_status "Swap file already exists"
fi

# Optimize swappiness for better performance
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# 2. Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 3. Install essential packages
echo "📦 Installing essential packages..."
sudo apt install -y \
    nginx \
    postgresql-14 \
    redis-server \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    git \
    htop \
    curl \
    wget \
    unzip \
    fail2ban \
    ufw \
    certbot \
    python3-certbot-nginx

print_status "Essential packages installed"

# 4. Install Node.js 18 LTS
echo "📦 Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
print_status "Node.js and PM2 installed"

# 5. Configure PostgreSQL for 2GB RAM
echo "🗄️ Optimizing PostgreSQL for 2GB RAM..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE wincloud;"
sudo -u postgres psql -c "CREATE USER wincloud WITH PASSWORD 'wincloud123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wincloud TO wincloud;"
sudo -u postgres psql -c "ALTER USER wincloud CREATEDB;"

# Optimize PostgreSQL config for 2GB RAM
sudo tee -a /etc/postgresql/14/main/postgresql.conf > /dev/null <<EOF

# Optimizations for 2GB RAM VPS
shared_buffers = 512MB                # 25% of RAM
effective_cache_size = 1536MB         # 75% of RAM  
maintenance_work_mem = 128MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 2
max_parallel_workers_per_gather = 1
max_parallel_workers = 2
EOF

sudo systemctl restart postgresql
print_status "PostgreSQL configured and optimized"

# 6. Configure Redis for 2GB RAM
echo "🔴 Optimizing Redis for 2GB RAM..."
sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis configuration for 2GB VPS
bind 127.0.0.1
port 6379
timeout 300
keepalive 60
tcp-backlog 511
databases 16

# Memory settings
maxmemory 256mb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence (lighter for small VPS)
save 900 1
save 300 10
save 60 10000

# Performance
tcp-keepalive 0
timeout 0
tcp-backlog 511
EOF

sudo systemctl restart redis-server
sudo systemctl enable redis-server
print_status "Redis configured and optimized"

# 7. Setup firewall
echo "🔥 Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow internal ports (localhost only)
sudo ufw allow from 127.0.0.1 to any port 5000
sudo ufw allow from 127.0.0.1 to any port 5173  
sudo ufw allow from 127.0.0.1 to any port 7000

sudo ufw --force enable
print_status "Firewall configured"

# 8. Configure fail2ban
echo "🛡️ Configuring fail2ban..."
sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
print_status "fail2ban configured"

# 9. Install and configure Nginx
echo "🌐 Configuring Nginx..."

# Copy our optimized config
sudo cp configs/nginx-panel-wincloud.conf /etc/nginx/sites-available/wincloud.conf

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Enable our site
sudo ln -sf /etc/nginx/sites-available/wincloud.conf /etc/nginx/sites-enabled/

# Optimize Nginx for 2GB RAM
sudo tee /etc/nginx/nginx.conf > /dev/null <<EOF
user www-data;
worker_processes 2;  # Match CPU cores
pid /run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
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
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
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
    
    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Include site configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Test Nginx config
if sudo nginx -t; then
    sudo systemctl restart nginx
    sudo systemctl enable nginx
    print_status "Nginx configured and started"
else
    print_error "Nginx configuration failed"
    exit 1
fi

# 10. Create SSL certificate directories
echo "🔐 Setting up SSL certificate directories..."
sudo mkdir -p /etc/ssl/certs /etc/ssl/private
sudo chmod 700 /etc/ssl/private

print_warning "SSL Certificate Setup Required:"
echo "1. Go to CloudFlare Dashboard → SSL/TLS → Origin Server"
echo "2. Create Certificate for *.wincloud.app"  
echo "3. Save certificate as: /etc/ssl/certs/wincloud.app.pem"
echo "4. Save private key as: /etc/ssl/private/wincloud.app.key"
echo "5. Run: sudo chmod 600 /etc/ssl/private/wincloud.app.key"

# 11. Create application directories
echo "📁 Creating application directories..."
mkdir -p ~/wincloud-builder/logs
mkdir -p ~/.pm2

# 12. System monitoring setup
echo "📊 Setting up monitoring..."

# Create simple monitoring script
tee ~/monitor.sh > /dev/null <<EOF
#!/bin/bash
echo "=== WinCloud VPS Monitoring ==="
echo "Date: \$(date)"
echo "Uptime: \$(uptime)"
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Network ==="
ss -tuln | grep -E ':(22|80|443|5000|5173|7000)'
echo ""
echo "=== Services ==="
systemctl is-active nginx postgresql redis-server
echo ""
echo "=== PM2 Processes ==="
pm2 list
EOF

chmod +x ~/monitor.sh

# 13. Create PM2 ecosystem for 2GB VPS
echo "⚙️ Creating optimized PM2 ecosystem..."

tee ~/ecosystem.config.js > /dev/null <<EOF
module.exports = {
  apps: [
    {
      name: 'wincloud-api',
      cwd: './backend',
      script: 'venv/bin/python',
      args: 'run_minimal_real_api.py',
      instances: 1,  // Single instance for 2GB RAM
      exec_mode: 'fork',
      max_memory_restart: '800M',  // Restart if using too much RAM
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        ENFORCE_HTTPS: 'true',
        API_DOMAIN: 'api.wincloud.app',
        DATABASE_URL: 'postgresql://wincloud:wincloud123@localhost:5432/wincloud',
        REDIS_URL: 'redis://localhost:6379'
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'wincloud-panel',
      cwd: './frontend',
      script: 'npx',
      args: 'vite preview --host 127.0.0.1 --port 5173',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5173,
        API_BASE_URL: 'https://api.wincloud.app'
      },
      error_file: './logs/panel-error.log',
      out_file: './logs/panel-out.log',
      log_file: './logs/panel-combined.log',
      time: true
    }
  ]
};
EOF

print_status "PM2 ecosystem created"

# 14. Performance optimization
echo "⚡ Applying performance optimizations..."

# Kernel parameters for small VPS
sudo tee -a /etc/sysctl.conf > /dev/null <<EOF

# Network optimizations for small VPS
net.core.rmem_default = 31457280
net.core.rmem_max = 67108864
net.core.wmem_default = 31457280
net.core.wmem_max = 67108864
net.core.somaxconn = 4096
net.core.netdev_max_backlog = 4000
net.core.netdev_budget = 300
net.ipv4.tcp_rmem = 4096 31457280 67108864
net.ipv4.tcp_wmem = 4096 31457280 67108864
net.ipv4.tcp_congestion_control = bbr

# File system optimizations
fs.file-max = 2097152
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sudo sysctl -p

# 15. Create useful aliases
echo "🔧 Creating useful aliases..."
tee -a ~/.bashrc > /dev/null <<EOF

# WinCloud aliases
alias wc-status='~/monitor.sh'
alias wc-logs='pm2 logs'
alias wc-restart='pm2 restart all'
alias wc-nginx='sudo nginx -t && sudo systemctl reload nginx'
alias wc-ssl='sudo ls -la /etc/ssl/certs/wincloud.app.pem /etc/ssl/private/wincloud.app.key'
EOF

# 16. Final system check
echo "🔍 Running final system check..."

echo "System Information:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Kernel: $(uname -r)"
echo "- CPU: $(nproc) cores"
echo "- RAM: $(free -h | grep Mem | awk '{print $2}')"
echo "- Disk: $(df -h / | tail -1 | awk '{print $2}')"
echo "- IP: 139.99.91.108"

echo ""
echo "Services Status:"
systemctl is-active nginx postgresql redis-server fail2ban ufw

echo ""
echo "🎉 VPS Setup Complete!"
echo "=================================="
print_status "2GB VPS optimized and ready!"
echo ""
echo "📋 Next Steps:"
echo "1. Setup CloudFlare DNS records:"
echo "   A    wincloud.app         → 139.99.91.108"
echo "   A    panel.wincloud.app   → 139.99.91.108"  
echo "   A    api.wincloud.app     → 139.99.91.108"
echo ""
echo "2. Install SSL certificate (see instructions above)"
echo ""
echo "3. Deploy WinCloud application:"
echo "   git clone your-repo"
echo "   cd wincloud-builder"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "4. Monitor with: ~/monitor.sh"
echo ""
print_status "Ready for deployment! 🚀"
EOF
