#!/bin/bash

# WinCloud Builder - VPS Setup Script
# Chạy trên Ubuntu 20.04/22.04

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
echo "=============================================="
echo "  🚀 WinCloud Builder - VPS Setup Script"
echo "=============================================="
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root. This is okay for VPS setup."
fi

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System updated"

# Install essential packages
print_info "Installing essential packages..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
print_status "Essential packages installed"

# Install Docker
print_info "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl start docker
systemctl enable docker
print_status "Docker installed and started"

# Install Docker Compose (standalone)
print_info "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
print_status "Docker Compose installed"

# Install Node.js (for frontend building)
print_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
print_status "Node.js installed: $(node --version)"

# Install Python 3.11 (for backend)
print_info "Installing Python 3.11..."
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
print_status "Python installed: $(python3.11 --version)"

# Install Nginx (for reverse proxy)
print_info "Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
print_status "Nginx installed and started"

# Install SSL tools
print_info "Installing SSL tools..."
apt install -y certbot python3-certbot-nginx
print_status "SSL tools installed"

# Create wincloud user (if not exists)
if ! id "wincloud" &>/dev/null; then
    print_info "Creating wincloud user..."
    useradd -m -s /bin/bash wincloud
    usermod -aG docker wincloud
    usermod -aG sudo wincloud
    print_status "User 'wincloud' created"
else
    print_info "User 'wincloud' already exists"
fi

# Configure firewall
print_info "Configuring firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5000/tcp  # Backend API
ufw --force enable
print_status "Firewall configured"

# Create project directory
print_info "Creating project directory..."
mkdir -p /var/www/wincloud
chown wincloud:wincloud /var/www/wincloud
print_status "Project directory created"

# Show system info
print_status "VPS Setup completed successfully!"
echo
print_info "System Information:"
echo "  🖥️  OS: $(lsb_release -d | cut -f2)"
echo "  🐳 Docker: $(docker --version)"
echo "  🔧 Docker Compose: $(docker-compose --version)"
echo "  🟢 Node.js: $(node --version)"
echo "  🐍 Python: $(python3.11 --version)"
echo "  🌐 Nginx: $(nginx -v 2>&1)"
echo
print_info "Next steps:"
echo "  1. Switch to wincloud user: su - wincloud"
echo "  2. Clone your project: git clone <your-repo>"
echo "  3. Run deployment script"






