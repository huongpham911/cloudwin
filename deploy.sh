#!/bin/bash

# WinCloud Builder - Production Deployment Script
# Usage: ./deploy.sh [development|production]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${1:-development}
NGINX_MODE=${2:-false}

echo -e "${BLUE}"
echo "=========================================="
echo "  🚀 WinCloud Builder Deployment Script"
echo "=========================================="
echo -e "${NC}"

if [ "$NGINX_MODE" = "nginx" ]; then
    echo -e "${YELLOW}🌐 Nginx Mode: Using docker-compose.nginx.yml${NC}"
elif [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${GREEN}🚀 Production Mode: Using docker-compose.prod.yml${NC}"
else
    echo -e "${BLUE}🛠️  Development Mode: Using docker-compose.dev.yml${NC}"
fi

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

# Check if environment is valid
if [[ ! "$ENVIRONMENT" =~ ^(development|production)$ ]]; then
    print_error "Invalid environment. Use 'development' or 'production'"
    echo "Usage: ./deploy.sh [development|production] [nginx]"
    echo "Examples:"
    echo "  ./deploy.sh development        # Development without nginx"
    echo "  ./deploy.sh production         # Production without nginx"  
    echo "  ./deploy.sh production nginx   # Production with nginx reverse proxy"
    exit 1
fi

print_info "Deploying WinCloud Builder in $ENVIRONMENT mode..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker first."
    exit 1
fi

print_status "Docker is running"

# Check if required files exist
if [ "$ENVIRONMENT" = "production" ]; then
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Using env.production as template."
        if [ -f "env.production" ]; then
            cp env.production .env
            print_warning "Please edit .env file with your production settings before continuing."
            print_info "Production checklist:"
            print_info "  - Change SECRET_KEY to secure 32-char string"
            print_info "  - Change database and Redis passwords"
            print_info "  - Add your DigitalOcean SSH key ID"
            print_info "  - Configure SMTP settings"
            print_info "  - Update domain names"
            read -p "Press Enter to continue after editing .env file..."
        else
            print_error "env.production file not found. Cannot create .env file."
            exit 1
        fi
    fi
    
    # Check if tokens_secure.json exists
    if [ ! -f "backend/tokens_secure.json" ]; then
        print_error "backend/tokens_secure.json not found. Please add your DigitalOcean API tokens using the secure token management system."
        exit 1
    fi
    
    # Check if SSH keys exist
    if [ ! -f "backend/keys.txt" ]; then
        print_warning "backend/keys.txt not found. Creating empty file."
        touch backend/keys.txt
    fi
    
    # Check SSL certificates if using nginx mode
    if [ "$NGINX_MODE" = "nginx" ]; then
        if [ ! -f "nginx/ssl/wincloud.app.pem" ] || [ ! -f "nginx/ssl/wincloud.app.key" ]; then
            print_warning "SSL certificates not found in nginx/ssl/"
            print_info "Please add your SSL certificates:"
            print_info "  - nginx/ssl/wincloud.app.pem"
            print_info "  - nginx/ssl/wincloud.app.key"
            read -p "Continue without SSL? (y/N): " -r
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
fi

print_status "Required files check completed"

# Stop existing containers
print_info "Stopping existing containers..."
if [ "$NGINX_MODE" = "nginx" ]; then
    docker-compose -f docker-compose.nginx.yml down --remove-orphans 2>/dev/null || true
elif [ "$ENVIRONMENT" = "production" ]; then
    docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
else
    # Try both dev and default compose files
    docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true
    docker-compose down --remove-orphans 2>/dev/null || true
fi

print_status "Existing containers stopped"

# Clean up old images (optional)
read -p "Do you want to remove old Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cleaning up old Docker images..."
    docker system prune -f --volumes
    print_status "Docker cleanup completed"
fi

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    print_info "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    print_status "Frontend dependencies installed"
fi

# Install backend dependencies in virtual environment (for development)
# Note: This is not needed for Docker deployment, but useful for local development
if [ "$ENVIRONMENT" = "development" ] && [ "$SKIP_VENV" != "true" ]; then
    if [ ! -d "backend/venv" ]; then
        print_info "Creating Python virtual environment... (Skip with SKIP_VENV=true)"
        cd backend
        
        # Check for python3 first, then python
        if command -v python3 &> /dev/null; then
            python3 -m venv venv
        elif command -v python &> /dev/null; then
            python -m venv venv
        else
            print_warning "Python not found. Skipping virtual environment creation."
            print_info "This is OK for Docker deployment."
            cd ..
            SKIP_VENV=true
        fi
        
        if [ "$SKIP_VENV" != "true" ]; then
            # Activate virtual environment
            source venv/bin/activate 2>/dev/null || source venv/Scripts/activate
            
            # Upgrade pip and install dependencies
            pip install --upgrade pip
            pip install -r requirements.txt
            
            cd ..
            print_status "Backend virtual environment created"
        fi
    fi
fi

# Build and start containers
print_info "Building and starting containers..."

if [ "$NGINX_MODE" = "nginx" ]; then
    # Nginx Production deployment with reverse proxy
    print_info "Starting Nginx production deployment with SSL..."
    
    # Check nginx config exists
    if [ ! -f "nginx/nginx.conf" ]; then
        print_error "nginx/nginx.conf not found. Please setup nginx configuration first."
        exit 1
    fi
    
    # Load environment variables
    if [ -f ".env" ]; then
        export $(grep -v '^#' .env | xargs)
    fi
    
    # Build and start with nginx
    docker-compose -f docker-compose.nginx.yml build --no-cache
    docker-compose -f docker-compose.nginx.yml up -d
    
    # Wait for services
    print_info "Waiting for services to be healthy..."
    sleep 30
    
    print_status "Nginx production deployment successful!"
    echo
    print_info "🌍 Production URLs with SSL:"
    print_info "   https://wincloud.app - Landing Page"
    print_info "   https://panel.wincloud.app - Control Panel"
    print_info "   https://api.wincloud.app - API Backend"
    echo
    print_info "🔧 Direct Access:"
    print_info "   http://localhost:80 - Nginx"
    print_info "   http://localhost:443 - Nginx SSL"
    
elif [ "$ENVIRONMENT" = "production" ]; then
    # Production deployment
    print_info "Starting production deployment with Docker Compose..."
    
    # Load environment variables
    export $(grep -v '^#' .env | xargs)
    
    # Build and start production containers
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check health of services
    if docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; then
        print_status "Production deployment successful!"
        echo
        print_info "🌐 Frontend: http://localhost:${FRONTEND_PORT:-80}"
        print_info "🔧 Backend API: http://localhost:${BACKEND_PORT:-5000}"
        print_info "📚 API Docs: http://localhost:${BACKEND_PORT:-5000}/docs"
        print_info "💾 Database: localhost:${POSTGRES_PORT:-5432}"
        print_info "🔴 Redis: localhost:${REDIS_PORT:-6379}"
        echo
        print_info "🌍 Production URLs:"
        print_info "   https://wincloud.app - Landing Page"
        print_info "   https://panel.wincloud.app - Control Panel"
        print_info "   https://api.wincloud.app - API Backend"
    else
        print_error "Some services are not healthy. Check logs with:"
        echo "docker-compose -f docker-compose.prod.yml logs"
    fi
    
else
    # Development deployment
    print_info "Starting development deployment..."
    
    # Set development environment variables
    export ENVIRONMENT=development
    export NODE_ENV=development
    export POSTGRES_DB=wincloud_dev
    export POSTGRES_USER=wincloud
    export POSTGRES_PASSWORD=wincloud_dev
    export REDIS_PASSWORD=wincloud_dev_redis
    
    # Use development compose file with Redis
    COMPOSE_FILE="docker-compose.dev.yml"
    
    # Check if compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_warning "docker-compose.dev.yml not found. Using docker-compose.yml"
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Build all services first
    print_info "Building services..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    
    # Start database and redis first
    print_info "Starting database and Redis..."
    docker-compose -f $COMPOSE_FILE up -d db redis
    
    # Wait for database and redis to be ready
    print_info "Waiting for database and Redis to be ready..."
    sleep 15
    
    # Check database health with timeout
    print_info "Checking database connection..."
    DB_READY=0
    for i in {1..30}; do
        if docker-compose -f $COMPOSE_FILE exec -T db pg_isready -U wincloud >/dev/null 2>&1; then
            DB_READY=1
            break
        fi
        print_info "Waiting for database... ($i/30)"
        sleep 2
    done
    
    if [ $DB_READY -eq 0 ]; then
        print_error "Database failed to start. Check logs with: docker-compose -f $COMPOSE_FILE logs db"
        exit 1
    fi
    
    print_status "Database is ready"
    
    # Check Redis health with timeout  
    print_info "Checking Redis connection..."
    REDIS_READY=0
    for i in {1..20}; do
        if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli -a wincloud_dev_redis ping >/dev/null 2>&1; then
            REDIS_READY=1
            break
        fi
        print_info "Waiting for Redis... ($i/20)"
        sleep 2
    done
    
    if [ $REDIS_READY -eq 0 ]; then
        print_warning "Redis might not be ready, but continuing deployment..."
    else
        print_status "Redis is ready"
    fi
    
    # Start all services
    docker-compose -f $COMPOSE_FILE up -d
    
    print_status "Development deployment successful!"
    echo
    print_info "🌐 Frontend: http://localhost:5173"
    print_info "🏠 Home Page: http://localhost:7000"
    print_info "🔧 Backend API: http://localhost:5000"
    print_info "📚 API Docs: http://localhost:5000/docs"
    print_info "💾 Database: localhost:5433"
    print_info "🔴 Redis: localhost:6380"
    echo
    print_info "🛠️ Development Tools:"
    print_info "   Database UI: http://localhost:8080 (Adminer)"
    print_info "   Redis UI: http://localhost:8082 (Redis Commander)"
    print_info "     - User: admin, Pass: wincloud_redis_ui"
fi

echo
print_status "Deployment completed successfully!"

# Show useful commands
echo
print_info "Useful commands:"
if [ "$NGINX_MODE" = "nginx" ]; then
    echo "  📊 View logs: docker-compose -f docker-compose.nginx.yml logs -f"
    echo "  🛑 Stop all: docker-compose -f docker-compose.nginx.yml down"
    echo "  🔄 Restart: docker-compose -f docker-compose.nginx.yml restart"
    echo "  📈 Monitor: docker-compose -f docker-compose.nginx.yml top"
    echo "  🌐 Nginx logs: docker-compose -f docker-compose.nginx.yml logs nginx"
elif [ "$ENVIRONMENT" = "production" ]; then
    echo "  📊 View logs: docker-compose -f docker-compose.prod.yml logs -f"
    echo "  🛑 Stop all: docker-compose -f docker-compose.prod.yml down"
    echo "  🔄 Restart: docker-compose -f docker-compose.prod.yml restart"
    echo "  📈 Monitor: docker-compose -f docker-compose.prod.yml top"
else
    echo "  📊 View logs: docker-compose logs -f"
    echo "  🛑 Stop all: docker-compose down"
    echo "  🔄 Restart: docker-compose restart"
    echo "  📈 Monitor: docker-compose top"
fi

echo
print_info "Health check endpoints:"
echo "  🏥 Backend: curl http://localhost:${BACKEND_PORT:-5000}/health"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "  🏥 Frontend: curl http://localhost:${FRONTEND_PORT:-80}/health"
fi
