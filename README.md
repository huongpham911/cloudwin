# 🚀 WinCloud Builder

**Dashboard tự động hóa Windows RDP trên DigitalOcean**

WinCloud Builder là một nền tảng toàn diện cho việc tạo và quản lý Windows VPS trên DigitalOcean với giao diện thân thiện và tự động hóa hoàn toàn.

## 📋 Tính năng chính

### 🖥️ Quản lý VPS Windows
- **Windows Server 2022** - Phiên bản server đầy đủ
- **Windows 11 Pro** - Desktop với TPM bypass
- **Windows 11 LTSC** - Enterprise long-term support
- **Windows 10 LTSC** - Lightweight cho server
- **Tiny11/Tiny10** - Ultra-lightweight (2GB RAM tối thiểu)

### 🔐 Hệ thống Authentication
- Đăng nhập/đăng ký với email
- OAuth integration (Google, Facebook, GitHub)
- Role-based access control (RBAC)
- JWT token authentication

### 📊 Dashboard & Monitoring
- Real-time monitoring VPS
- Analytics và báo cáo sử dụng
- Cost optimization suggestions
- SSH terminal tích hợp

### ⚙️ Tích hợp DigitalOcean
- 100% DigitalOcean API
- Quản lý droplets, volumes, firewalls
- Spaces CDN integration
- Automatic backup scheduling

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Alembic** - Database migrations

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - State management
- **Vite** - Build tool

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy (production)
- **Gunicorn** - WSGI server (production)

## 🚀 Quick Start

### Development Mode

1. **Clone repository**
```bash
git clone https://github.com/yourusername/wincloud-builder.git
cd wincloud-builder
```

2. **Start development environment**
```bash
# Windows
./start_development.bat

# Linux/Mac
./deploy.sh development
```

3. **Access applications**
- 🌐 Frontend: http://localhost:5173
- 🔧 Backend API: http://localhost:5000
- 📚 API Docs: http://localhost:5000/docs
- 💾 Database: localhost:5432

### Production Deployment

1. **Prepare environment**
```bash
# Copy environment template
cp env.example .env

# Edit .env with your production settings
nano .env
```

2. **Configure DigitalOcean**
```bash
# Add your DO API tokens
vim backend/tokens.json

# Add SSH keys (optional)
vim backend/keys.txt
```

3. **Deploy**
```bash
# Linux/Mac
./deploy.sh production

# Windows (use WSL or Git Bash)
bash deploy.sh production
```

## 📁 Project Structure

```
wincloud-builder/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # API routes
│   │   ├── core/           # Configuration
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── alembic/            # Database migrations
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Docker configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   └── utils/         # Utilities
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Docker configuration
├── Test-data/             # Test files (NOT in git)
├── scripts/               # Deployment scripts
├── docs/                  # Documentation
├── docker-compose.yml     # Development compose
├── docker-compose.prod.yml # Production compose
└── deploy.sh             # Deployment script
```

## ⚙️ Configuration

### Environment Variables

Key configuration variables in `.env`:

```bash
# Application
SECRET_KEY=your-super-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/wincloud
DEBUG=false

# DigitalOcean
DO_SSH_KEY_ID=your-ssh-key-id

# Windows ISOs
WIN11_PRO_ISO_URL=https://your-storage.com/Win11_Pro.iso
WIN11_LTSC_ISO_URL=https://your-storage.com/Win11_LTSC.iso
# ... other ISO URLs

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-app-password

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### DigitalOcean API Tokens

Configure your DO API tokens in `backend/tokens_secure.json`:

```json
{
  "users": {
    "admin_user": {
      "tokens": [
        {
          "encrypted_token": "your_encrypted_token_here",
          "salt": "your_salt_here",
          "fingerprint": "token_fingerprint",
          "created_at": "2025-08-19T08:01:54.574044",
          "last_used": null,
          "usage_count": 0,
          "is_valid": true,
          "name": "Primary Token"
        }
      ],
      "created_at": "2025-08-18T14:44:50.309737",
      "total_tokens": 1,
      "updated_at": "2025-08-19T08:01:54.574082"
    }
  },
  "last_updated": "2025-08-19T08:01:54.574095",
  "version": "2.0",
  "encryption": "AES-256-Fernet-PBKDF2"
}
```

## 🔐 Security Features

- **HTTPS only** in production
- **CORS protection** configured
- **Rate limiting** on API endpoints
- **Input validation** with Pydantic
- **SQL injection protection** with SQLAlchemy
- **XSS protection** headers
- **CSRF protection** for forms

## 📊 Monitoring & Logging

### Health Checks
- `GET /health` - Application health
- `GET /api/v1/health` - API health
- Docker health checks enabled

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking and alerting
- Performance monitoring

## 🗄️ Database

### Migrations
```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Downgrade
alembic downgrade -1
```

### Backup
```bash
# Manual backup
docker-compose exec backup /backup.sh

# Automated backups run daily
# Check logs: docker-compose logs backup
```

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test

# Integration tests
cd Test-data
python -m pytest api_tests/
```

### Test Cleanup
```bash
# Clean up test resources
cd Test-data
python scripts/cleanup_all.py
```

## 🚀 API Documentation

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **OpenAPI JSON**: http://localhost:5000/api/v1/openapi.json

### Key Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/droplets` - List droplets
- `POST /api/v1/droplets` - Create droplet
- `GET /api/v1/regions` - Available regions
- `GET /api/v1/sizes` - Available sizes
- `GET /api/v1/images` - Windows images

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Use conventional commits
- Test in both development and production modes

## 📝 Troubleshooting

### Common Issues

**Database connection errors:**
```bash
# Check database status
docker-compose ps db

# View database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

**Frontend build errors:**
```bash
# Clear cache
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run lint
```

**API authentication issues:**
```bash
# Check backend logs
docker-compose logs backend

# Verify JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/v1/health
```

### Performance Optimization

**Backend:**
- Enable Redis caching
- Use database connection pooling
- Optimize SQL queries
- Enable Gunicorn workers

**Frontend:**
- Enable build optimization
- Use code splitting
- Optimize bundle size
- Enable browser caching

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Manager**: Quản lý dự án
- **Senior Developer**: Lập trình viên Senior
- **DevOps Engineer**: Kỹ sư DevOps

## 📞 Support

- 📧 Email: support@wincloud.app
- 📚 Documentation: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/wincloud-builder/issues)
- 💬 Discord: [Community Server](https://discord.gg/wincloud)

---

**Made with ❤️ for the Windows VPS community**
