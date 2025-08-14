from fastapi import APIRouter
from app.api.v1 import articles, sources, languages, summarization

api_router = APIRouter()

# Include all API route modules
api_router.include_router(
    articles.router,
    prefix="/articles",
    tags=["articles"]
)

api_router.include_router(
    sources.router,
    prefix="/sources",
    tags=["sources"]
)

api_router.include_router(
    languages.router,
    prefix="/languages",
    tags=["languages"]
)

api_router.include_router(
    summarization.router,
    prefix="/summarization",
    tags=["summarization"]
)
