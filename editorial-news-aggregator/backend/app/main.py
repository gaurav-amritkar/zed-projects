from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
import uvicorn

from app.core.config import settings
from app.core.database import engine, SessionLocal
from app.models import article, source, user
from app.api.v1 import api_router
from app.core.logging import setup_logging
from app.services.scheduler import start_scheduler, stop_scheduler

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events
    """
    # Startup
    logger.info("Starting Editorial News Aggregator API")

    # Create database tables
    article.Base.metadata.create_all(bind=engine)
    source.Base.metadata.create_all(bind=engine)
    user.Base.metadata.create_all(bind=engine)

    # Start background scheduler for content fetching
    start_scheduler()

    yield

    # Shutdown
    logger.info("Shutting down Editorial News Aggregator API")
    stop_scheduler()


# Create FastAPI application
app = FastAPI(
    title="Editorial News Aggregator API",
    description="A comprehensive multi-language editorial news aggregation platform",
    version="1.0.0",
    contact={
        "name": "Editorial News Aggregator Team",
        "email": "support@editorial-aggregator.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# Include API router
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["root"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint providing API information
    """
    return {
        "message": "Editorial News Aggregator API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "status": "operational"
    }


@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint
    """
    try:
        # Test database connection
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "database": db_status,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }


@app.exception_handler(404)
async def not_found_handler(request, exc):
    """
    Custom 404 handler
    """
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Endpoint not found",
            "message": f"The requested endpoint {request.url.path} was not found"
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request, exc):
    """
    Custom 500 handler
    """
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An unexpected error occurred. Please try again later."
        }
    )


@app.middleware("http")
async def log_requests(request, call_next):
    """
    Log all requests
    """
    logger.info(f"{request.method} {request.url.path} - Client: {request.client.host}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response


if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )
