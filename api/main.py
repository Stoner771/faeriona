"""
Faerion Authentication API
Main application file with comprehensive authentication, license management, 
reseller system, and ticketing platform
"""
from fastapi import FastAPI, status, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
import uvicorn
import logging

from database import engine, Base, check_database_connection, get_db
from config import settings
from routes import auth, admin, api, licenses, users, apps, logs, files, vars, resellers, tickets, subscriptions
from routes import websocket
from middleware.rate_limit import RateLimitMiddleware
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown"""
    logger.info("API starting up...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database created")
    yield
    logger.info("API shutting down...")


app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# ==================== MIDDLEWARE SETUP ====================
# IMPORTANT: Middleware is applied in REVERSE order (last added = first executed)
# So we add them in reverse order of execution

# Configure CORS middleware FIRST (so it executes last in the chain, before returning)
# Actually, add it last so it executes first to handle OPTIONS preflight
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS_LIST,
    allow_credentials=settings.ALLOWED_CREDENTIALS,
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
    max_age=3600,  # Cache preflight for 1 hour
)

# Add rate limiting middleware (executes after CORS)
if settings.RATE_LIMIT_ENABLED:
    app.add_middleware(RateLimitMiddleware)

# Include routers in order of priority
# Auth routes (most specific)
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])

# Admin routes
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(licenses.router, prefix="/api/admin/licenses", tags=["Licenses"])
app.include_router(users.router, prefix="/api/admin/users", tags=["Users"])
app.include_router(apps.router, prefix="/api/admin/apps", tags=["Applications"])
app.include_router(logs.router, prefix="/api/admin/logs", tags=["Logs"])
app.include_router(files.router, prefix="/api/admin/files", tags=["Files"])
app.include_router(vars.router, prefix="/api/admin/vars", tags=["Variables"])
app.include_router(subscriptions.router, prefix="/api/admin/subscriptions", tags=["Subscriptions"])
app.include_router(resellers.router, prefix="/api/admin/resellers", tags=["Resellers"])
app.include_router(tickets.router, prefix="/api/admin/tickets", tags=["Tickets"])

# Reseller API routes
from routes import reseller_api
app.include_router(reseller_api.router, prefix="/api/reseller", tags=["Reseller API"])

# WebSocket routes
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# Client API routes (least specific)
app.include_router(api.router, prefix="/api", tags=["Client API"])


# ==================== SYSTEM ENDPOINTS ====================

@app.get("/", tags=["System"])
async def root():
    """Root endpoint - API information"""
    return {
        "status": "active",
        "api": settings.API_TITLE,
        "version": settings.API_VERSION,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health", tags=["System"], status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint - basic connectivity test"""
    db_healthy = await check_database_connection()
    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database": "connected" if db_healthy else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/status", tags=["System"])
async def api_status(db: Session = Depends(get_db)):
    """Detailed API status with statistics"""
    try:
        from models.user import User
        from models.admin import Admin
        from models.app import App
        from models.license import License
        from models.reseller import Reseller
        
        db_healthy = await check_database_connection()
        
        return {
            "status": "operational",
            "api": {
                "name": settings.API_TITLE,
                "version": settings.API_VERSION,
                "environment": "development" if settings.RELOAD else "production"
            },
            "database": {
                "status": "connected" if db_healthy else "disconnected",
                "users": db.query(User).count(),
                "admins": db.query(Admin).count(),
                "apps": db.query(App).count(),
                "licenses": db.query(License).count(),
                "resellers": db.query(Reseller).count()
            },
            "configuration": {
                "rate_limiting_enabled": settings.RATE_LIMIT_ENABLED,
                "cors_origins": len(settings.ALLOWED_ORIGINS_LIST),
                "jwt_algorithm": settings.ALGORITHM
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in status endpoint: {e}")
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }, status.HTTP_500_INTERNAL_SERVER_ERROR


@app.get("/api/time", tags=["System"])
async def server_time():
    """Get server timestamp"""
    return {
        "timestamp": int(datetime.utcnow().timestamp()),
        "iso_format": datetime.utcnow().isoformat(),
        "timezone": "UTC"
    }


# ==================== MAIN ENTRY POINT ====================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        workers=1 if settings.RELOAD else settings.WORKERS,
        log_level=settings.LOG_LEVEL.lower()
    )
