from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid

from app.core.database import Base


class Source(Base):
    """
    Source model for news sources (newspapers, websites, RSS feeds)
    """
    __tablename__ = "sources"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Basic source information
    name = Column(String(200), nullable=False, unique=True, index=True)
    display_name = Column(String(200), nullable=False)
    description = Column(Text)
    url = Column(String(1000), nullable=False)
    domain = Column(String(100), nullable=False, index=True)

    # Source type and configuration
    source_type = Column(String(50), nullable=False, default='rss', index=True)  # rss, scrape, api
    language = Column(String(10), nullable=False, default='en', index=True)
    country = Column(String(10), default='US', index=True)
    category = Column(String(100), default='news', index=True)

    # RSS/Feed specific
    rss_url = Column(String(1000))
    feed_url = Column(String(1000))

    # Scraping configuration
    scraping_config = Column(JSONB, default=dict)  # CSS selectors, XPath, etc.

    # API configuration
    api_config = Column(JSONB, default=dict)  # API keys, endpoints, etc.

    # Editorial/Opinion specific URLs
    editorial_url = Column(String(1000))
    opinion_url = Column(String(1000))
    editorial_rss = Column(String(1000))
    opinion_rss = Column(String(1000))

    # Source metadata
    logo_url = Column(String(1000))
    favicon_url = Column(String(1000))
    publisher = Column(String(200))
    established_year = Column(Integer)

    # Status and health
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    health_status = Column(String(20), default='healthy', index=True)  # healthy, warning, error
    last_successful_fetch = Column(DateTime(timezone=True))
    last_error = Column(Text)
    error_count = Column(Integer, default=0)

    # Fetching configuration
    fetch_interval_minutes = Column(Integer, default=60)  # How often to fetch
    request_delay = Column(Float, default=1.0)  # Delay between requests
    max_articles_per_fetch = Column(Integer, default=50)
    user_agent = Column(String(500))

    # Quality and reliability metrics
    reliability_score = Column(Float, default=1.0)  # 0-1 score
    avg_response_time = Column(Float)  # Average response time in seconds
    success_rate = Column(Float, default=1.0)  # Success rate (0-1)

    # Content filtering
    content_filters = Column(JSONB, default=dict)  # Filters for content selection
    keyword_filters = Column(JSONB, default=list)  # Keywords to look for
    exclude_keywords = Column(JSONB, default=list)  # Keywords to exclude

    # Rate limiting
    rate_limit_requests = Column(Integer, default=60)  # Requests per hour
    rate_limit_window = Column(Integer, default=3600)  # Window in seconds

    # Legal and compliance
    robots_txt_url = Column(String(1000))
    robots_txt_compliant = Column(Boolean, default=True)
    copyright_notice = Column(Text)
    terms_of_service_url = Column(String(1000))

    # Analytics and statistics
    total_articles_fetched = Column(Integer, default=0)
    total_successful_fetches = Column(Integer, default=0)
    total_failed_fetches = Column(Integer, default=0)
    avg_articles_per_fetch = Column(Float, default=0)

    # Timestamps
    created_date = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_date = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())
    last_fetched = Column(DateTime(timezone=True))

    # Additional metadata
    metadata = Column(JSONB, default=dict)
    tags = Column(JSONB, default=list)

    # Relationships
    articles = relationship("Article", back_populates="source", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Source(id={self.id}, name='{self.name}', language='{self.language}')>"

    def __str__(self):
        return self.display_name or self.name

    @property
    def is_healthy(self):
        """Check if source is healthy"""
        return self.health_status == 'healthy' and self.is_active

    @property
    def has_recent_fetch(self):
        """Check if source has been fetched recently"""
        if not self.last_fetched:
            return False

        time_diff = datetime.utcnow() - self.last_fetched.replace(tzinfo=None)
        # Consider recent if fetched within 2x the fetch interval
        max_age_minutes = self.fetch_interval_minutes * 2
        return time_diff.total_seconds() <= max_age_minutes * 60

    @property
    def needs_fetch(self):
        """Check if source needs to be fetched"""
        if not self.is_active:
            return False

        if not self.last_fetched:
            return True

        time_diff = datetime.utcnow() - self.last_fetched.replace(tzinfo=None)
        return time_diff.total_seconds() >= self.fetch_interval_minutes * 60

    @property
    def fetch_url(self):
        """Get the URL to fetch content from"""
        if self.source_type == 'rss' and self.rss_url:
            return self.rss_url
        elif self.source_type == 'rss' and self.editorial_rss:
            return self.editorial_rss
        elif self.source_type == 'scrape' and self.editorial_url:
            return self.editorial_url
        else:
            return self.url

    @property
    def error_rate(self):
        """Calculate error rate"""
        total_fetches = self.total_successful_fetches + self.total_failed_fetches
        if total_fetches == 0:
            return 0.0
        return self.total_failed_fetches / total_fetches

    def update_health_status(self, is_success: bool, error_message: str = None):
        """Update health status based on fetch result"""
        if is_success:
            self.last_successful_fetch = func.now()
            self.total_successful_fetches += 1
            self.error_count = 0
            self.last_error = None

            # Update health status
            if self.error_count == 0:
                self.health_status = 'healthy'
        else:
            self.total_failed_fetches += 1
            self.error_count += 1
            self.last_error = error_message

            # Update health status based on error count
            if self.error_count >= 5:
                self.health_status = 'error'
            elif self.error_count >= 2:
                self.health_status = 'warning'

        # Update success rate
        total_fetches = self.total_successful_fetches + self.total_failed_fetches
        if total_fetches > 0:
            self.success_rate = self.total_successful_fetches / total_fetches

    def update_fetch_stats(self, articles_count: int, response_time: float):
        """Update fetching statistics"""
        self.last_fetched = func.now()
        self.total_articles_fetched += articles_count

        # Update average articles per fetch
        total_fetches = self.total_successful_fetches + self.total_failed_fetches
        if total_fetches > 0:
            self.avg_articles_per_fetch = self.total_articles_fetched / total_fetches

        # Update average response time
        if self.avg_response_time is None:
            self.avg_response_time = response_time
        else:
            # Weighted average (giving more weight to recent measurements)
            self.avg_response_time = (self.avg_response_time * 0.8) + (response_time * 0.2)

    def get_scraping_selector(self, element: str):
        """Get CSS selector for scraping specific elements"""
        if self.scraping_config and element in self.scraping_config:
            return self.scraping_config[element]
        return None

    def add_keyword_filter(self, keyword: str):
        """Add keyword to filter list"""
        if self.keyword_filters is None:
            self.keyword_filters = []
        if keyword not in self.keyword_filters:
            self.keyword_filters.append(keyword)

    def add_exclude_keyword(self, keyword: str):
        """Add keyword to exclude list"""
        if self.exclude_keywords is None:
            self.exclude_keywords = []
        if keyword not in self.exclude_keywords:
            self.exclude_keywords.append(keyword)

    def add_tag(self, tag: str):
        """Add tag to source"""
        if self.tags is None:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)

    def update_metadata(self, key: str, value):
        """Update metadata field"""
        if self.metadata is None:
            self.metadata = {}
        self.metadata[key] = value

    def is_rate_limited(self, current_requests: int, window_start: datetime):
        """Check if source is rate limited"""
        if not self.rate_limit_requests or not self.rate_limit_window:
            return False

        time_diff = datetime.utcnow() - window_start
        if time_diff.total_seconds() >= self.rate_limit_window:
            return False

        return current_requests >= self.rate_limit_requests

    def should_respect_robots_txt(self):
        """Check if should respect robots.txt"""
        return self.robots_txt_compliant and self.source_type == 'scrape'

    def to_dict(self, include_config: bool = False):
        """Convert source to dictionary"""
        data = {
            "id": str(self.id),
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "url": self.url,
            "domain": self.domain,
            "source_type": self.source_type,
            "language": self.language,
            "country": self.country,
            "category": self.category,
            "rss_url": self.rss_url,
            "editorial_url": self.editorial_url,
            "opinion_url": self.opinion_url,
            "logo_url": self.logo_url,
            "publisher": self.publisher,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "health_status": self.health_status,
            "last_successful_fetch": self.last_successful_fetch.isoformat() if self.last_successful_fetch else None,
            "reliability_score": self.reliability_score,
            "success_rate": self.success_rate,
            "total_articles_fetched": self.total_articles_fetched,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "tags": self.tags,
        }

        if include_config:
            data.update({
                "scraping_config": self.scraping_config,
                "api_config": self.api_config,
                "content_filters": self.content_filters,
                "keyword_filters": self.keyword_filters,
                "exclude_keywords": self.exclude_keywords,
                "fetch_interval_minutes": self.fetch_interval_minutes,
                "rate_limit_requests": self.rate_limit_requests,
                "metadata": self.metadata,
            })

        return data

    @classmethod
    def from_dict(cls, data: dict):
        """Create source instance from dictionary"""
        # Remove fields that shouldn't be set directly
        exclude_fields = {"id", "created_date", "updated_date", "articles"}
        source_data = {k: v for k, v in data.items() if k not in exclude_fields}

        return cls(**source_data)

    @classmethod
    def create_from_config(cls, config: dict):
        """Create source from configuration dictionary"""
        source = cls(
            name=config.get("name"),
            display_name=config.get("display_name", config.get("name")),
            url=config.get("url"),
            domain=config.get("domain", ""),
            source_type=config.get("type", "rss"),
            language=config.get("language", "en"),
            rss_url=config.get("rss_url"),
            editorial_url=config.get("editorial_url"),
            opinion_url=config.get("opinion_url"),
            editorial_rss=config.get("editorial_rss"),
            opinion_rss=config.get("opinion_rss"),
            scraping_config=config.get("scraping_config", {}),
            fetch_interval_minutes=config.get("fetch_interval", 60),
        )

        # Extract domain from URL if not provided
        if not source.domain and source.url:
            from urllib.parse import urlparse
            parsed_url = urlparse(source.url)
            source.domain = parsed_url.netloc

        return source
