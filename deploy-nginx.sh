#!/bin/bash

# WinCloud Builder - Production Deployment với Nginx
# Usage: ./deploy-nginx.sh [setup|start|stop|restart|logs]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="wincloud.app"
API_DOMAIN="api.wincloud.app"
PANEL_DOMAIN="panel.wincloud.app"
SERVER_IP="139.99.91.108"

echo -e "${BLUE}"
echo "=========================================="
echo "  🚀 WinCloud Builder Nginx Deployment"
echo "=========================================="
echo -e "${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please don't run as root for Docker commands"
    exit 1
fi

# Default action
ACTION=${1:-setup}

case $ACTION in
    "setup")
        print_info "Setting up WinCloud Builder production environment..."
        
        # Check if Docker is running
        if ! docker info >/dev/null 2>&1; then
            print_error "Docker is not running. Please start Docker first."
            exit 1
        fi
        print_status "Docker is running"
        
        # Check if required files exist
        if [ ! -f ".env" ]; then
            if [ -f "env.docker.example" ]; then
                print_warning "Creating .env from env.docker.example"
                cp env.docker.example .env
                print_warning "Please edit .env file with your production settings"
                echo "Key settings to update:"
                echo "  - POSTGRES_PASSWORD"
                echo "  - REDIS_PASSWORD" 
                echo "  - SECRET_KEY"
                echo "  - DO_SSH_KEY_ID"
                echo "  - Email settings (if needed)"
                echo ""
                read -p "Press Enter after editing .env file..."
            else
                print_error "No environment file found. Please create .env file."
                exit 1
            fi
        fi
        print_status "Environment file exists"
        
        # Check SSL certificates
        if [ ! -f "nginx/ssl/wincloud.app.pem" ] || [ ! -f "nginx/ssl/wincloud.app.key" ]; then
            print_error "SSL certificates not found!"
            echo ""
            echo "Please setup CloudFlare Origin Certificate:"
            echo "1. Go to CloudFlare Dashboard → SSL/TLS → Origin Server"
            echo "2. Create Certificate for *.wincloud.app"
            echo "3. Save files as:"
            echo "   - nginx/ssl/wincloud.app.pem"
            echo "   - nginx/ssl/wincloud.app.key"
            echo ""
            echo "Or run: ./scripts/install-cloudflare-ssl.sh"
            exit 1
        fi
        print_status "SSL certificates found"
        
        # Check DigitalOcean tokens
        if [ ! -f "backend/tokens_secure.json" ]; then
            print_error "backend/tokens_secure.json not found. Please add your DigitalOcean API tokens using the secure token management system."
            exit 1
        fi
        print_status "DigitalOcean tokens found"
        
        # Create required directories
        mkdir -p nginx/ssl nginx/html nginx/logs
        mkdir -p backend/logs frontend/logs
        
        # Set proper permissions for SSL
        chmod 600 nginx/ssl/wincloud.app.key 2>/dev/null || true
        chmod 644 nginx/ssl/wincloud.app.pem 2>/dev/null || true
        
        print_status "Setup completed"
        
        # Start services
        print_info "Building and starting services..."
        docker-compose -f docker-compose.nginx.yml build --no-cache
        docker-compose -f docker-compose.nginx.yml up -d
        
        # Wait for services to be healthy
        print_info "Waiting for services to be healthy..."
        sleep 30
        
        # Check health
        print_info "Checking service health..."
        if docker-compose -f docker-compose.nginx.yml ps | grep -q "healthy"; then
            print_status "All services are healthy!"
        else
            print_warning "Some services may still be starting..."
        fi
        
        echo ""
        print_status "🎉 WinCloud Builder deployed successfully!"
        echo ""
        print_info "🌍 Production URLs:"
        echo "   https://wincloud.app - Landing Page"
        echo "   https://panel.wincloud.app - Control Panel"
        echo "   https://api.wincloud.app - API Backend"
        echo "   https://api.wincloud.app/docs - API Documentation"
        echo ""
        print_info "🔧 Local Services:"
        echo "   Database: localhost:5432 (internal)"
        echo "   Redis: localhost:6379 (internal)"
        echo ""
        ;;
        
    "start")
        print_info "Starting WinCloud Builder services..."
        docker-compose -f docker-compose.nginx.yml up -d
        print_status "Services started"
        ;;
        
    "stop")
        print_info "Stopping WinCloud Builder services..."
        docker-compose -f docker-compose.nginx.yml down
        print_status "Services stopped"
        ;;
        
    "restart")
        print_info "Restarting WinCloud Builder services..."
        docker-compose -f docker-compose.nginx.yml restart
        print_status "Services restarted"
        ;;
        
    "logs")
        print_info "Showing logs (Ctrl+C to exit)..."
        docker-compose -f docker-compose.nginx.yml logs -f
        ;;
        
    "status")
        print_info "Service status:"
        docker-compose -f docker-compose.nginx.yml ps
        echo ""
        print_info "Resource usage:"
        docker stats --no-stream
        ;;
        
    "health")
        print_info "Checking health endpoints..."
        
        # Test internal health
        echo "Testing backend health..."
        if curl -s http://localhost:5000/health >/dev/null 2>&1; then
            print_status "Backend: OK"
        else
            print_error "Backend: Failed"
        fi
        
        # Test external domains (if DNS is setup)
        echo "Testing external domains..."
        
        if curl -s -k https://api.wincloud.app/health >/dev/null 2>&1; then
            print_status "API Domain: OK"
        else
            print_warning "API Domain: Not accessible (DNS may not be setup)"
        fi
        
        if curl -s -k https://panel.wincloud.app/health >/dev/null 2>&1; then
            print_status "Panel Domain: OK"
        else
            print_warning "Panel Domain: Not accessible (DNS may not be setup)"
        fi
        
        if curl -s -k https://wincloud.app/health >/dev/null 2>&1; then
            print_status "Main Domain: OK"
        else
            print_warning "Main Domain: Not accessible (DNS may not be setup)"
        fi
        ;;
        
    "ssl")
        print_info "SSL Certificate Information:"
        if [ -f "nginx/ssl/wincloud.app.pem" ]; then
            openssl x509 -in nginx/ssl/wincloud.app.pem -text -noout | grep -E "(Subject:|DNS:|Not Before|Not After)"
        else
            print_error "SSL certificate not found"
        fi
        ;;
        
    "backup")
        print_info "Creating manual backup..."
        docker-compose -f docker-compose.nginx.yml exec backup /backup.sh
        print_status "Backup completed"
        ;;
        
    "clean")
        print_warning "This will remove all containers, volumes, and data. Are you sure? (y/N)"
        read -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.nginx.yml down -v --remove-orphans
            docker system prune -a -f
            print_status "Cleanup completed"
        else
            print_info "Cleanup cancelled"
        fi
        ;;
        
    *)
        echo "Usage: $0 [setup|start|stop|restart|logs|status|health|ssl|backup|clean]"
        echo ""
        echo "Commands:"
        echo "  setup    - Initial setup and deployment"
        echo "  start    - Start all services"
        echo "  stop     - Stop all services"
        echo "  restart  - Restart all services"
        echo "  logs     - View logs"
        echo "  status   - Show service status"
        echo "  health   - Check health endpoints"
        echo "  ssl      - Show SSL certificate info"
        echo "  backup   - Create manual backup"
        echo "  clean    - Remove everything (dangerous)"
        exit 1
        ;;
esac
