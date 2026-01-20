"""
Configuration file for Faerion API
Centralized settings for the entire application
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
import json
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Configuration
    API_TITLE: str = "Faerion Authentication API"
    API_VERSION: str = "2.0.0"
    API_DESCRIPTION: str = "Complete authentication platform with license management, resellers, and ticketing system"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./faerion_auth.db")
    SQLALCHEMY_ECHO: bool = os.getenv("SQLALCHEMY_ECHO", "False").lower() == "true"
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    RELOAD: bool = os.getenv("RELOAD", "True").lower() == "true"
    WORKERS: int = int(os.getenv("WORKERS", 4))
    
    # CORS Configuration
    _ALLOWED_ORIGINS_DEFAULT: List[str] = [
        "https://9430425c-4539-4f25-b772-b387e3e8f77b.lovableproject.com",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://team.heavencloud.in:2006",
        "https://team.heavencloud.in:2006",
        "http://team.heavencloud.in",
        "https://team.heavencloud.in",
        "http://team.heavencloud.in:2004",
        "https://faerion-one.vercel.app",
        "https://www.faerion.store",
        "https://faerion.store",
        "http://localhost:5173",
        "http://localhost:3000",
  ]
    # Read raw env value as string to avoid pydantic-settings attempting JSON decode
    ALLOWED_ORIGINS: str = Field("", env="ALLOWED_ORIGINS")
    ALLOWED_CREDENTIALS: bool = True
    # FIXED: Changed from ["*"] to explicit methods - ["*"] doesn't handle OPTIONS correctly
    ALLOWED_METHODS: List[str] = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
    ALLOWED_HEADERS: List[str] = ["*"]
    
    # JWT Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 30))
    
    # Password Configuration
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGITS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = False
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", 100))
    RATE_LIMIT_WINDOW_SECONDS: int = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", 60))
    
    # Email Configuration (Optional)
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "False").lower() == "true"
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@faerion.com")
    
    # Webhook Configuration
    WEBHOOK_ENABLED: bool = True
    WEBHOOK_TIMEOUT: int = 30
    WEBHOOK_MAX_RETRIES: int = 3
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/faerion.log")
    
    # File Upload Configuration
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    ALLOWED_FILE_EXTENSIONS: List[str] = ["pdf", "txt", "jpg", "jpeg", "png", "zip"]
    
    # License Configuration
    LICENSE_EXPIRY_DAYS: int = 365
    LICENSE_AUTO_RENEWAL: bool = False
    
    # Reseller Configuration
    RESELLER_COMMISSION_PERCENTAGE: float = 30.0
    RESELLER_MIN_BALANCE: float = 0.0
    
    # Admin Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@faerion.com")
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    
    # Features
    ENABLE_TWO_FACTOR_AUTH: bool = False
    ENABLE_EMAIL_VERIFICATION: bool = False
    ENABLE_PHONE_VERIFICATION: bool = False
    
    # Security
    ALLOWED_IP_ADDRESSES: List[str] = []  # Empty = allow all
    REQUIRE_HTTPS: bool = False  # Set to True in production
    SECURE_COOKIES: bool = False  # Set to True in production
    SAME_SITE_COOKIES: str = "lax"  # Options: strict, lax, none
    
    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_allowed_origins_list(self) -> List[str]:
        """Return ALLOWED_ORIGINS as a parsed list.

        It combines the default list with any origins specified in the
        ALLOWED_ORIGINS environment variable.
        """
        # Start with the default list
        origins = set(self._ALLOWED_ORIGINS_DEFAULT)

        # Parse origins from the environment variable
        raw = self.ALLOWED_ORIGINS
        if raw is not None:
            s = str(raw).strip()
            if s:
                # Try JSON first
                try:
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        for origin in parsed:
                            origins.add(origin.strip())
                except Exception:
                    # Fallback to comma-separated
                    for origin in s.split(","):
                        if origin.strip():
                            origins.add(origin.strip())
        
        return list(origins)

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return self.get_allowed_origins_list()


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Convenience function for quick access
settings = get_settings()
