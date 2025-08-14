from pydantic_settings import BaseSettings
from pydantic import Field, validator
from typing import List, Optional, Any, Dict
import os
from pathlib import Path


class Settings(BaseSettings):
    """
    Application settings configuration
    """

    # Application settings
    PROJECT_NAME: str = "Editorial News Aggregator"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Multi-language editorial news aggregation platform"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=True, env="DEBUG")

    # API settings
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")

    # Security
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        env="CORS_ORIGINS"
    )
    ALLOWED_HOSTS: List[str] = Field(
        default=["localhost", "127.0.0.1", "*"],
        env="ALLOWED_HOSTS"
    )

    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DATABASE_ECHO: bool = Field(default=False, env="DATABASE_ECHO")
    DATABASE_POOL_SIZE: int = Field(default=20, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(default=0, env="DATABASE_MAX_OVERFLOW")

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    REDIS_DB: int = Field(default=0, env="REDIS_DB")
    CACHE_TTL: int = Field(default=3600, env="CACHE_TTL")  # 1 hour

    # Celery
    CELERY_BROKER_URL: str = Field(default="redis://localhost:6379/0", env="CELERY_BROKER_URL")
    CELERY_RESULT_BACKEND: str = Field(default="redis://localhost:6379/0", env="CELERY_RESULT_BACKEND")
    CELERY_TASK_SERIALIZER: str = "json"
    CELERY_ACCEPT_CONTENT: List[str] = ["json"]
    CELERY_RESULT_SERIALIZER: str = "json"
    CELERY_TIMEZONE: str = "UTC"

    # External APIs
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    GOOGLE_TRANSLATE_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_TRANSLATE_API_KEY")
    NEWS_API_KEY: Optional[str] = Field(default=None, env="NEWS_API_KEY")
    HUGGINGFACE_API_TOKEN: Optional[str] = Field(default=None, env="HUGGINGFACE_API_TOKEN")
    AZURE_TRANSLATOR_KEY: Optional[str] = Field(default=None, env="AZURE_TRANSLATOR_KEY")
    AZURE_TRANSLATOR_REGION: str = Field(default="eastus", env="AZURE_TRANSLATOR_REGION")

    # Summarization settings
    DEFAULT_SUMMARY_MODEL: str = Field(default="facebook/bart-large-cnn", env="DEFAULT_SUMMARY_MODEL")
    MAX_SUMMARY_LENGTH: int = Field(default=150, env="MAX_SUMMARY_LENGTH")
    MIN_SUMMARY_LENGTH: int = Field(default=50, env="MIN_SUMMARY_LENGTH")
    SUMMARY_BATCH_SIZE: int = Field(default=4, env="SUMMARY_BATCH_SIZE")

    # Scraping settings
    REQUEST_DELAY: float = Field(default=1.0, env="REQUEST_DELAY")
    REQUEST_TIMEOUT: int = Field(default=30, env="REQUEST_TIMEOUT")
    MAX_RETRIES: int = Field(default=3, env="MAX_RETRIES")
    USER_AGENT: str = Field(
        default="Editorial-News-Aggregator/1.0 (+https://editorial-aggregator.com)",
        env="USER_AGENT"
    )

    # Content settings
    SUPPORTED_LANGUAGES: List[str] = Field(
        default=["en", "hi", "bn", "ta", "mr", "te", "gu", "kn", "ml", "pa"],
        env="SUPPORTED_LANGUAGES"
    )
    DEFAULT_LANGUAGE: str = Field(default="en", env="DEFAULT_LANGUAGE")
    ARTICLES_PER_PAGE: int = Field(default=20, env="ARTICLES_PER_PAGE")
    MAX_ARTICLE_AGE_DAYS: int = Field(default=30, env="MAX_ARTICLE_AGE_DAYS")

    # File storage
    UPLOAD_DIR: str = Field(default="uploads", env="UPLOAD_DIR")
    MAX_FILE_SIZE_MB: int = Field(default=10, env="MAX_FILE_SIZE_MB")
    ALLOWED_FILE_EXTENSIONS: List[str] = Field(
        default=[".jpg", ".jpeg", ".png", ".gif", ".pdf"],
        env="ALLOWED_FILE_EXTENSIONS"
    )

    # Logging
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")
    LOG_FORMAT: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        env="LOG_FORMAT"
    )
    LOG_FILE: Optional[str] = Field(default=None, env="LOG_FILE")

    # Monitoring & Analytics
    ENABLE_METRICS: bool = Field(default=True, env="ENABLE_METRICS")
    METRICS_PORT: int = Field(default=8001, env="METRICS_PORT")
    SENTRY_DSN: Optional[str] = Field(default=None, env="SENTRY_DSN")

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = Field(default=100, env="RATE_LIMIT_REQUESTS")
    RATE_LIMIT_WINDOW: int = Field(default=3600, env="RATE_LIMIT_WINDOW")  # 1 hour

    # Email settings (for notifications)
    SMTP_HOST: Optional[str] = Field(default=None, env="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, env="SMTP_PORT")
    SMTP_USERNAME: Optional[str] = Field(default=None, env="SMTP_USERNAME")
    SMTP_PASSWORD: Optional[str] = Field(default=None, env="SMTP_PASSWORD")
    SMTP_TLS: bool = Field(default=True, env="SMTP_TLS")
    EMAILS_FROM_EMAIL: str = Field(default="noreply@editorial-aggregator.com", env="EMAILS_FROM_EMAIL")
    EMAILS_FROM_NAME: str = Field(default="Editorial News Aggregator", env="EMAILS_FROM_NAME")

    # Scheduler settings
    FETCH_INTERVAL_MINUTES: int = Field(default=60, env="FETCH_INTERVAL_MINUTES")  # 1 hour
    CLEANUP_INTERVAL_HOURS: int = Field(default=24, env="CLEANUP_INTERVAL_HOURS")  # 1 day
    SUMMARY_BATCH_INTERVAL_MINUTES: int = Field(default=30, env="SUMMARY_BATCH_INTERVAL_MINUTES")

    # News sources configuration
    NEWS_SOURCES_CONFIG: Dict[str, Any] = {
        "english": {
            "nyt_opinion": {
                "name": "The New York Times - Opinion",
                "url": "https://rss.nytimes.com/services/xml/rss/nyt/Opinion.xml",
                "type": "rss",
                "language": "en"
            },
            "guardian_editorial": {
                "name": "The Guardian - Editorial",
                "url": "https://www.theguardian.com/tone/editorials/rss",
                "type": "rss",
                "language": "en"
            },
            "toi_editorial": {
                "name": "Times of India - Editorial",
                "url": "https://timesofindia.indiatimes.com/rssfeeds/784865811.cms",
                "type": "rss",
                "language": "en"
            },
            "hindu_opinion": {
                "name": "The Hindu - Opinion",
                "url": "https://www.thehindu.com/opinion/feeder/default.rss",
                "type": "rss",
                "language": "en"
            }
        },
        "hindi": {
            "ht_hindi_editorial": {
                "name": "Hindustan Times Hindi - Editorial",
                "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
                "type": "rss",
                "language": "hi"
            },
            "amarujala_editorial": {
                "name": "Amar Ujala - Editorial",
                "url": "https://www.amarujala.com/rss/editorial.xml",
                "type": "rss",
                "language": "hi"
            }
        },
        "bengali": {
            "anandabazar": {
                "name": "Anandabazar Patrika - Editorial",
                "url": "https://www.anandabazar.com/rss/editorial",
                "type": "rss",
                "language": "bn"
            }
        }
    }

    @validator("CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v: str) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @validator("SUPPORTED_LANGUAGES", pre=True)
    def assemble_supported_languages(cls, v: str) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()

# Ensure upload directory exists
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(exist_ok=True)
