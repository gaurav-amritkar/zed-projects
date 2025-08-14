from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.models.article import Article
from app.models.source import Source
from app.services.summarization import SummarizationService
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize summarization service
summarization_service = SummarizationService()


@router.get("/", response_model=Dict[str, Any])
async def get_articles(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Articles per page"),
    language: Optional[str] = Query(None, description="Filter by language"),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_editorial: Optional[bool] = Query(None, description="Filter by editorial flag"),
    is_opinion: Optional[bool] = Query(None, description="Filter by opinion flag"),
    date_from: Optional[str] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search in title and content"),
    sort_by: str = Query("published_date", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)")
):
    """
    Get articles with filtering, pagination, and search
    """
    try:
        # Build query
        query = db.query(Article).filter(Article.is_archived == False)

        # Apply filters
        if language:
            query = query.filter(Article.language == language)

        if source_id:
            try:
                source_uuid = uuid.UUID(source_id)
                query = query.filter(Article.source_id == source_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid source ID format")

        if category:
            query = query.filter(Article.category == category)

        if is_editorial is not None:
            query = query.filter(Article.is_editorial == is_editorial)

        if is_opinion is not None:
            query = query.filter(Article.is_opinion == is_opinion)

        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.filter(Article.published_date >= from_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_from format")

        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d")
                query = query.filter(Article.published_date <= to_date)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_to format")

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Article.title.ilike(search_filter)) |
                (Article.content.ilike(search_filter)) |
                (Article.summary.ilike(search_filter))
            )

        # Apply sorting
        if hasattr(Article, sort_by):
            sort_column = getattr(Article, sort_by)
            if sort_order.lower() == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(Article.published_date.desc())

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * per_page
        articles = query.offset(offset).limit(per_page).all()

        # Convert to dict format
        articles_data = []
        for article in articles:
            article_dict = article.to_dict(include_content=False)
            articles_data.append(article_dict)

        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1

        return {
            "articles": articles_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages,
                "has_next": has_next,
                "has_prev": has_prev
            },
            "filters": {
                "language": language,
                "source_id": source_id,
                "category": category,
                "is_editorial": is_editorial,
                "is_opinion": is_opinion,
                "date_from": date_from,
                "date_to": date_to,
                "search": search
            }
        }

    except Exception as e:
        logger.error(f"Error fetching articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch articles")


@router.get("/{article_id}", response_model=Dict[str, Any])
async def get_article(
    article_id: str,
    db: Session = Depends(get_db),
    include_content: bool = Query(True, description="Include full content")
):
    """
    Get a specific article by ID
    """
    try:
        # Validate UUID
        try:
            article_uuid = uuid.UUID(article_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid article ID format")

        # Fetch article
        article = db.query(Article).filter(Article.id == article_uuid).first()

        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Increment view count
        article.increment_view_count()
        db.commit()

        # Return article data
        return article.to_dict(include_content=include_content)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching article {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch article")


@router.post("/{article_id}/summarize", response_model=Dict[str, Any])
async def generate_article_summary(
    article_id: str,
    db: Session = Depends(get_db),
    model_name: Optional[str] = Query(None, description="Summarization model to use"),
    regenerate: bool = Query(False, description="Regenerate even if summary exists")
):
    """
    Generate or regenerate summary for an article
    """
    try:
        # Validate UUID
        try:
            article_uuid = uuid.UUID(article_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid article ID format")

        # Fetch article
        article = db.query(Article).filter(Article.id == article_uuid).first()

        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Check if summary already exists
        if article.summary and not regenerate:
            return {
                "message": "Summary already exists",
                "summary": article.summary,
                "regenerated": False
            }

        # Generate summary
        success, summary, error = await summarization_service.summarize_article(
            article, model_name
        )

        if success:
            db.commit()
            return {
                "message": "Summary generated successfully",
                "summary": summary,
                "regenerated": regenerate or not article.summary,
                "model_used": model_name or settings.DEFAULT_SUMMARY_MODEL
            }
        else:
            raise HTTPException(status_code=500, detail=f"Summarization failed: {error}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating summary for article {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate summary")


@router.get("/{article_id}/similar", response_model=List[Dict[str, Any]])
async def get_similar_articles(
    article_id: str,
    db: Session = Depends(get_db),
    limit: int = Query(5, ge=1, le=20, description="Number of similar articles to return")
):
    """
    Get articles similar to the specified article
    """
    try:
        # Validate UUID
        try:
            article_uuid = uuid.UUID(article_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid article ID format")

        # Fetch article
        article = db.query(Article).filter(Article.id == article_uuid).first()

        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Simple similarity based on tags, topics, and source
        query = db.query(Article).filter(
            Article.id != article_uuid,
            Article.is_archived == False
        )

        # Filter by same language and category
        query = query.filter(
            Article.language == article.language,
            Article.category == article.category
        )

        # If article has tags, find articles with similar tags
        if article.tags:
            # This is a simplified approach - in production, you might use vector similarity
            tag_conditions = []
            for tag in article.tags:
                tag_conditions.append(Article.tags.contains([tag]))

            if tag_conditions:
                from sqlalchemy import or_
                query = query.filter(or_(*tag_conditions))

        # Order by publication date (recent first) and limit results
        similar_articles = query.order_by(Article.published_date.desc()).limit(limit).all()

        # Convert to dict format
        return [article.to_dict(include_content=False) for article in similar_articles]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching similar articles for {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch similar articles")


@router.post("/{article_id}/share", response_model=Dict[str, Any])
async def share_article(
    article_id: str,
    db: Session = Depends(get_db)
):
    """
    Track article share event
    """
    try:
        # Validate UUID
        try:
            article_uuid = uuid.UUID(article_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid article ID format")

        # Fetch article
        article = db.query(Article).filter(Article.id == article_uuid).first()

        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        # Increment share count
        article.increment_share_count()
        db.commit()

        return {
            "message": "Share tracked successfully",
            "share_count": article.share_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error tracking share for article {article_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to track share")


@router.get("/trending/", response_model=List[Dict[str, Any]])
async def get_trending_articles(
    db: Session = Depends(get_db),
    language: Optional[str] = Query(None, description="Filter by language"),
    days: int = Query(7, ge=1, le=30, description="Number of days to consider for trending"),
    limit: int = Query(10, ge=1, le=50, description="Number of articles to return")
):
    """
    Get trending articles based on views and shares
    """
    try:
        # Calculate date range
        since_date = datetime.utcnow() - timedelta(days=days)

        # Build query
        query = db.query(Article).filter(
            Article.is_archived == False,
            Article.published_date >= since_date
        )

        if language:
            query = query.filter(Article.language == language)

        # Order by engagement metrics (views + shares)
        trending_articles = query.order_by(
            (Article.view_count + Article.share_count * 2).desc(),
            Article.published_date.desc()
        ).limit(limit).all()

        return [article.to_dict(include_content=False) for article in trending_articles]

    except Exception as e:
        logger.error(f"Error fetching trending articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch trending articles")


@router.get("/recent/", response_model=List[Dict[str, Any]])
async def get_recent_articles(
    db: Session = Depends(get_db),
    language: Optional[str] = Query(None, description="Filter by language"),
    source_id: Optional[str] = Query(None, description="Filter by source ID"),
    hours: int = Query(24, ge=1, le=168, description="Number of hours to look back"),
    limit: int = Query(20, ge=1, le=100, description="Number of articles to return")
):
    """
    Get most recent articles
    """
    try:
        # Calculate date range
        since_date = datetime.utcnow() - timedelta(hours=hours)

        # Build query
        query = db.query(Article).filter(
            Article.is_archived == False,
            Article.published_date >= since_date
        )

        if language:
            query = query.filter(Article.language == language)

        if source_id:
            try:
                source_uuid = uuid.UUID(source_id)
                query = query.filter(Article.source_id == source_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid source ID format")

        # Order by publication date (most recent first)
        recent_articles = query.order_by(Article.published_date.desc()).limit(limit).all()

        return [article.to_dict(include_content=False) for article in recent_articles]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching recent articles: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent articles")


@router.get("/stats/", response_model=Dict[str, Any])
async def get_articles_stats(
    db: Session = Depends(get_db),
    language: Optional[str] = Query(None, description="Filter by language")
):
    """
    Get article statistics
    """
    try:
        # Base query
        query = db.query(Article).filter(Article.is_archived == False)

        if language:
            query = query.filter(Article.language == language)

        # Total counts
        total_articles = query.count()
        total_editorials = query.filter(Article.is_editorial == True).count()
        total_opinions = query.filter(Article.is_opinion == True).count()
        total_with_summaries = query.filter(Article.is_summary_generated == True).count()

        # Recent stats (last 24 hours)
        recent_date = datetime.utcnow() - timedelta(hours=24)
        recent_articles = query.filter(Article.published_date >= recent_date).count()

        # Language distribution
        language_stats = {}
        if not language:  # Only show distribution if not filtering by language
            from sqlalchemy import func
            lang_counts = db.query(
                Article.language,
                func.count(Article.id).label('count')
            ).filter(Article.is_archived == False).group_by(Article.language).all()

            language_stats = {lang: count for lang, count in lang_counts}

        # Source distribution
        source_stats = {}
        source_counts = db.query(
            Source.name,
            func.count(Article.id).label('count')
        ).join(Article).filter(Article.is_archived == False)

        if language:
            source_counts = source_counts.filter(Article.language == language)

        source_counts = source_counts.group_by(Source.name).order_by(func.count(Article.id).desc()).limit(10).all()
        source_stats = {name: count for name, count in source_counts}

        return {
            "total_articles": total_articles,
            "total_editorials": total_editorials,
            "total_opinions": total_opinions,
            "total_with_summaries": total_with_summaries,
            "recent_articles_24h": recent_articles,
            "summary_coverage_percent": round((total_with_summaries / total_articles * 100) if total_articles > 0 else 0, 2),
            "language_distribution": language_stats,
            "top_sources": source_stats
        }

    except Exception as e:
        logger.error(f"Error fetching article stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch article statistics")
