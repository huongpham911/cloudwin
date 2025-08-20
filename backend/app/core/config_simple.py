import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required fields
    SECRET_KEY: str = "default-secret-key-change-in-production"
    DATABASE_URL: str = "sqlite:///./wincloud.db"
    
    # Optional fields with defaults
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "WinCloud Builder"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BCRYPT_ROUNDS: int = 12
    DEBUG: bool = False
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # CORS - simple string list
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:7001"
    
    # Windows settings - all optional
    WIN11_PRO_ISO_URL: str = ""
    WIN11_LTSC_ISO_URL: str = ""
    TINY11_ISO_URL: str = ""
    WIN10_LTSC_ISO_URL: str = ""
    TINY10_ISO_URL: str = ""
    WIN_SERVER_2022_ISO_URL: str = ""
    USE_TINYINSTALLER: bool = False
    TINYINSTALLER_URL: str = ""
    DO_SSH_KEY_ID: str = ""
    SSH_KEY_PATH: str = ""
    
    # Email settings
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = ""
    EMAILS_FROM_NAME: str = "WinCloud Builder"

    # DigitalOcean settings
    DIGITALOCEAN_API_TOKEN: str = ""
    DIGITALOCEAN_MODEL_ACCESS_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
