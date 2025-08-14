from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from app.core.database import Base


class Article(Base):
    """
    Article model for storing news articles and editorials
    """
    __tablename__ = "articles"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic article information
    title = Column(String(500), nullable=False, index=True)
    url = Column(String(1000), nullable=False, unique=True)
    content = Column(Text, nullable=False)
    excerpt = Column(Text)  # Brief excerpt or description
    summary = Column(Text)  # AI-generated summary

    # Metadata
    language = Column(String(10), nullable=False, default='en', index=True)
    published_date = Column(DateTime(timezone=True), nullable=False, index=True)
    fetched_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_date = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Source information
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"), nullable=False, index=True)
    author = Column(String(200))
    category = Column(String(100), default='editorial', index=True)

    # Content analysis
    word_count = Column(Integer)
    reading_time = Column(Integer)  # Estimated reading time in minutes
    sentiment_score = Column(Float)  # Sentiment analysis score (-1 to 1)

    # Content flags and status
    is_editorial = Column(Boolean, default=True, nullable=False, index=True)
    is_opinion = Column(Boolean, default=False, nullable=False)
    is_summary_generated = Column(Boolean, default=False, nullable=False)
    is_translated = Column(Boolean, default=False, nullable=False)
    original_language = Column(String(10))  # If translated, store original language

    # Engagement metrics
    view_count = Column(Integer, default=0)
    share_count = Column(Integer, default=0)

    # Content quality and filtering
    quality_score = Column(Float)  # Content quality score (0-1)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    duplicate_of = Column(UUID(as_uuid=True), ForeignKey("articles.id"))

    # Additional metadata stored as JSON
    metadata = Column(JSONB, default=dict)

    # Tags and categories
    tags = Column(JSONB, default=list)  # List of tags
    topics = Column(JSONB, default=list)  # List of detected topics

    # SEO and display
    slug = Column(String(500), unique=True, index=True)
    meta_description = Column(String(300))
    image_url = Column(String(1000))

    # Archive and cleanup
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    archive_date = Column(DateTime(timezone=True))

    # Relationships
    source = relationship("Source", back_populates="articles")
    duplicate_articles = relationship(
        "Article",
        backref="original_article",
        remote_side=[id]
    )

    # Indexes for better query performance
    __table_args__ = (
        Index("idx_articles_published_date_desc", published_date.desc()),
        Index("idx_articles_language_category", language, category),
        Index("idx_articles_source_published", source_id, published_date.desc()),
        Index("idx_articles_editorial_published", is_editorial, published_date.desc()),
        Index("idx_articles_quality_published", quality_score.desc(), published_date.desc()),
        Index("idx_articles_search", title, content),  # For full-text search
    )

    def __repr__(self):
        return f"<Article(id={self.id}, title='{self.title[:50]}...', source={self.source.name if self.source else 'Unknown'})>"

    def __str__(self):
        return self.title

    @property
    def short_title(self):
        """Return shortened title for display"""
        if len(self.title) > 100:
            return self.title[:97] + "..."
        return self.title

    @property
    def formatted_published_date(self):
        """Return formatted published date"""
        if self.published_date:
            return self.published_date.strftime("%Y-%m-%d %H:%M:%S")
        return None

    @property
    def age_in_days(self):
        """Return article age in days"""
        if self.published_date:
            return (datetime.utcnow() - self.published_date.replace(tzinfo=None)).days
        return None

    @property
    def is_recent(self):
        """Check if article is recent (within last 7 days)"""
        age = self.age_in_days
        return age is not None and age <= 7

    @property
    def content_preview(self):
        """Return content preview (first 200 characters)"""
        if self.content:
            if len(self.content) > 200:
                return self.content[:197] + "..."
            return self.content
        return ""

    @property
    def summary_preview(self):
        """Return summary preview or content preview if no summary"""
        if self.summary:
            return self.summary
        return self.content_preview

    def calculate_reading_time(self):
        """Calculate estimated reading time based on word count"""
        if self.word_count:
            # Average reading speed: 200 words per minute
            self.reading_time = max(1, round(self.word_count / 200))
        elif self.content:
            # Estimate word count if not available
            estimated_words = len(self.content.split())
            self.reading_time = max(1, round(estimated_words / 200))
        else:
            self.reading_time = 1

    def generate_slug(self):
        """Generate URL slug from title"""
        import re
        if self.title:
            # Convert to lowercase and replace spaces/special chars with hyphens
            slug = re.sub(r'[^\w\s-]', '', self.title.lower())
            slug = re.sub(r'[-\s]+', '-', slug)
            self.slug = slug[:500]  # Limit length

    def update_metadata(self, key: str, value):
        """Update metadata field"""
        if self.metadata is None:
            self.metadata = {}
        self.metadata[key] = value

    def add_tag(self, tag: str):
        """Add a tag to the article"""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)

    def remove_tag(self, tag: str):
        """Remove a tag from the article"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)

    def add_topic(self, topic: str):
        """Add a topic to the article"""
        if self.topics is None:
            self.topics = []
        if topic not in self.topics:
            self.topics.append(topic)

    def is_stale(self, max_age_days: int = 30):
        """Check if article is stale (older than max_age_days)"""
        age = self.age_in_days
        return age is not None and age > max_age_days

    def mark_as_duplicate(self, original_article_id: str):
        """Mark article as duplicate of another article"""
        self.is_duplicate = True
        self.duplicate_of = original_article_id

    def increment_view_count(self):
        """Increment view count"""
        self.view_count = (self.view_count or 0) + 1

    def increment_share_count(self):
        """Increment share count"""
        self.share_count = (self.share_count or 0) + 1

    def to_dict(self, include_content: bool = True):
        """Convert article to dictionary"""
        data = {
            "id": str(self.id),
            "title": self.title,
            "url": self.url,
            "excerpt": self.excerpt,
            "summary": self.summary,
            "language": self.language,
            "published_date": self.formatted_published_date,
            "fetched_date": self.fetched_date.isoformat() if self.fetched_date else None,
            "author": self.author,
            "category": self.category,
            "word_count": self.word_count,
            "reading_time": self.reading_time,
            "sentiment_score": self.sentiment_score,
            "is_editorial": self.is_editorial,
            "is_opinion": self.is_opinion,
            "is_summary_generated": self.is_summary_generated,
            "is_translated": self.is_translated,
            "original_language": self.original_language,
            "view_count": self.view_count,
            "share_count": self.share_count,
            "quality_score": self.quality_score,
            "tags": self.tags,
            "topics": self.topics,
            "slug": self.slug,
            "meta_description": self.meta_description,
            "image_url": self.image_url,
            "source": self.source.to_dict() if self.source else None,
        }

        if include_content:
            data["content"] = self.content

        return data

    @classmethod
    def from_dict(cls, data: dict):
        """Create article instance from dictionary"""
        # Remove fields that shouldn't be set directly
        exclude_fields = {"id", "fetched_date", "updated_date", "source"}
        article_data = {k: v for k, v in data.items() if k not in exclude_fields}

        return cls(**article_data)
