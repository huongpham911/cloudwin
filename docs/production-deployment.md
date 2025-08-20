# WinCloud Builder - Production Environment Configuration

## Environment Variables

### Backend Configuration
```bash
# FastAPI Settings
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=your-super-secret-key-here-change-in-production
API_V1_STR=/api/v1

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/wincloud_prod

# CORS Settings
BACKEND_CORS_ORIGINS=["https://yourdomain.com", "https://www.yourdomain.com"]

# Security
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# DigitalOcean API
DO_API_TOKENS_FILE=/opt/wincloud/tokens_secure.json
DO_SSH_KEYS_FILE=/opt/wincloud/keys.txt

# Redis (for session management)
REDIS_URL=redis://localhost:6379/0

# Email (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/wincloud/app.log
```

### Frontend Configuration
```bash
# React App Settings
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENVIRONMENT=production

# Build Settings
GENERATE_SOURCEMAP=false
```

## Production Deployment Checklist

### 1. Server Setup
- [ ] Ubuntu 20.04+ or CentOS 8+ server
- [ ] Minimum 2GB RAM, 20GB storage
- [ ] Python 3.9+ installed
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 13+ installed
- [ ] Redis 6+ installed
- [ ] Nginx installed

### 2. Security Configuration
- [ ] SSL certificate configured (Let's Encrypt recommended)
- [ ] Firewall configured (UFW or firewalld)
- [ ] SSH key-based authentication
- [ ] Regular security updates enabled
- [ ] Fail2Ban configured for brute force protection

### 3. Database Setup
```sql
-- Create production database
CREATE DATABASE wincloud_prod;
CREATE USER wincloud_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE wincloud_prod TO wincloud_user;
```

### 4. Application Deployment
```bash
# Backend deployment
cd /opt/wincloud/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_minimal_real_api.py

# Frontend deployment
cd /opt/wincloud/frontend
npm install
npm run build
# Copy build files to Nginx document root
```

### 5. Process Management
- [ ] Use systemd for backend service
- [ ] Use PM2 or systemd for process monitoring
- [ ] Configure log rotation
- [ ] Set up health checks

### 6. Monitoring & Backup
- [ ] Database backup automation
- [ ] Application logs monitoring
- [ ] Performance monitoring
- [ ] Uptime monitoring

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend (React build)
    location / {
        root /var/www/wincloud/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Systemd Service Configuration

### Backend Service
```ini
# /etc/systemd/system/wincloud-backend.service
[Unit]
Description=WinCloud Builder Backend
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=wincloud
Group=wincloud
WorkingDirectory=/opt/wincloud/backend
Environment=PATH=/opt/wincloud/backend/venv/bin
ExecStart=/opt/wincloud/backend/venv/bin/python run_minimal_real_api.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Environment-Specific Settings

### Development
```python
# backend/app/core/config.py additions
class DevelopmentConfig(Settings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite:///./wincloud_dev.db"
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
```

### Staging
```python
class StagingConfig(Settings):
    ENVIRONMENT: str = "staging"
    DEBUG: bool = False
    DATABASE_URL: str = "postgresql://user:pass@staging-db:5432/wincloud_staging"
    CORS_ORIGINS: List[str] = ["https://staging.yourdomain.com"]
```

### Production
```python
class ProductionConfig(Settings):
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    CORS_ORIGINS: List[str] = Field(..., env="BACKEND_CORS_ORIGINS")
    LOG_LEVEL: str = "INFO"
```

## Docker Configuration (Optional)

### Dockerfile.backend
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python", "run_minimal_real_api.py"]
```

### Dockerfile.frontend
```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://wincloud:password@db:5432/wincloud
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: wincloud
      POSTGRES_USER: wincloud
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Performance Optimization

### Backend Optimizations
- Use Gunicorn with multiple workers
- Enable Redis caching for frequent queries
- Optimize database queries with indexes
- Use connection pooling

### Frontend Optimizations
- Enable gzip compression in Nginx
- Use CDN for static assets
- Implement code splitting
- Enable browser caching

## Security Hardening

### SSL/TLS Configuration
```nginx
# Strong SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# HSTS
add_header Strict-Transport-Security "max-age=63072000" always;

# Security headers
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

### Database Security
- Regular security updates
- Encrypted connections only
- Regular backup testing
- Access logging enabled

## Monitoring & Alerting

### Health Check Endpoints
```python
# Add to backend
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0"
    }

@app.get("/health/db")
async def db_health_check():
    # Check database connection
    pass
```

### Log Configuration
```python
# Structured logging for production
import structlog

logger = structlog.get_logger()
logger.info("User action", user_id=user.id, action="login", ip=request.client.host)
```
