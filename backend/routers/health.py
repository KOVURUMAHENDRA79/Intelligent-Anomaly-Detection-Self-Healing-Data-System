from fastapi import APIRouter
from backend.core.config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
async def health_check():
    """Simple health check returning API status and project name."""
    return {
        "status": "active",
        "project": settings.PROJECT_NAME,
        "database": "postgresql",
        "messaging": "redis"
    }
