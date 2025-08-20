# WinCloud Builder Backend

## Overview
FastAPI backend for WinCloud Builder - A web dashboard to automate Windows RDP creation on DigitalOcean.

## Features
- JWT-based authentication with refresh tokens
- User registration and login
- Password strength validation
- Rate limiting
- PostgreSQL database
- Docker support

## Tech Stack
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT (python-jose)
- Pydantic for validation
- Docker

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL (or use Docker)
- Docker & Docker Compose (optional)

### Local Development

1. Clone the repository
```bash
cd wincloud-builder/backend
```

2. Create virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Create `.env` file from `.env.example`
```bash
cp .env.example .env
# Edit .env with your settings
```

5. Run the application
```bash
uvicorn app.main:app --reload --port 5000
```

The API will be available at http://localhost:5000

### Docker Development

1. Run with Docker Compose
```bash
cd wincloud-builder
docker-compose up -d
```

The API will be available at http://localhost:5000

## API Documentation

Once running, you can access:
- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Authentication Endpoints

### Register
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "StrongPass123!",
  "full_name": "John Doe"
}
```

### Login
```bash
POST /api/v1/auth/login
{
  "username": "johndoe",
  "password": "StrongPass123!"
}
```

### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer {access_token}
```

### Refresh Token
```bash
POST /api/v1/auth/refresh
{
  "refresh_token": "{refresh_token}"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection URL | Required |
| SECRET_KEY | JWT secret key | Required |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access token expiry | 30 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh token expiry | 7 |
| CORS_ORIGINS | Allowed CORS origins | ["http://localhost:3000"] |

## Database Migrations

Create initial migration:
```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Testing

Run tests:
```bash
pytest
```

With coverage:
```bash
pytest --cov=app tests/
```

## Security Features

- Password requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

- JWT tokens with refresh capability
- Rate limiting on authentication endpoints
- CORS protection
- Input validation with Pydantic

## Project Structure
```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py         # Dependencies
│   │   └── v1/
│   │       ├── api.py      # API router
│   │       └── auth.py     # Auth endpoints
│   ├── core/
│   │   ├── config.py       # Settings
│   │   ├── database.py     # DB connection
│   │   └── security.py     # Security utils
│   ├── models/
│   │   └── user.py         # User model
│   ├── schemas/
│   │   ├── token.py        # Token schemas
│   │   └── user.py         # User schemas
│   ├── services/
│   │   └── auth.py         # Auth service
│   └── main.py             # FastAPI app
├── requirements.txt
├── Dockerfile
└── README.md
```
