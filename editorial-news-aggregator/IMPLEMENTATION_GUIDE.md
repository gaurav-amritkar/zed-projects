# Editorial News Aggregator - Implementation Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Development Setup](#development-setup)
5. [Production Deployment](#production-deployment)
6. [API Configuration](#api-configuration)
7. [News Sources Configuration](#news-sources-configuration)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

## Overview

The Editorial News Aggregator is a comprehensive multi-language platform that:
- Fetches editorial and opinion articles from major newspapers
- Provides AI-powered summarization using state-of-the-art NLP models
- Supports multiple languages including English and Indian regional languages
- Offers a modern Progressive Web App (PWA) interface
- Scales horizontally with microservices architecture

### Key Features
- **Multi-Source Aggregation**: RSS feeds and web scraping from 20+ news sources
- **AI Summarization**: BART, PEGASUS, GPT-3.5/4, and T5 models
- **Multi-Language Support**: English, Hindi, Bengali, Tamil, Marathi, and more
- **Real-time Updates**: Background processing with Celery
- **Archive System**: Full-text search with Elasticsearch
- **Cross-Platform**: Responsive PWA for web, Android, and iOS

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React PWA)   │◄──►│   (FastAPI)     │◄──►│  (PostgreSQL)   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │  Task Queue     │    │     Cache       │
         └──────────────┤  (Celery +      │◄──►│   (Redis)       │
                        │   Redis)        │    │                 │
                        └─────────────────┘    └─────────────────┘
                                 │
                        ┌─────────────────┐    ┌─────────────────┐
                        │  AI Services    │    │  Search Engine  │
                        │ (OpenAI, HF)    │    │ (Elasticsearch) │
                        │                 │    │                 │
                        └─────────────────┘    └─────────────────┘
```

### Technology Stack

**Backend:**
- FastAPI (Python 3.9+)
- SQLAlchemy ORM with PostgreSQL
- Celery for background tasks
- Redis for caching and message brokering
- BeautifulSoup4 + Scrapy for web scraping
- Transformers (Hugging Face) for NLP

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- Redux Toolkit for state management
- Progressive Web App (PWA) capabilities
- Internationalization (i18next)

**Infrastructure:**
- Docker & Docker Compose
- Kubernetes ready
- Prometheus + Grafana monitoring
- ELK stack for logging

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose (recommended)

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd editorial-news-aggregator

# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (see API Configuration section)
nano .env
```

### 3. Start with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Admin Panel**: http://localhost:5050 (pgAdmin)
- **Monitoring**: http://localhost:3001 (Grafana)

## Development Setup

### Backend Development

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Background Tasks

```bash
# Start Celery worker (in backend directory)
celery -A app.tasks.celery_app worker --loglevel=info

# Start Celery beat scheduler
celery -A app.tasks.celery_app beat --loglevel=info
```

### Running Tests

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## Production Deployment

### Kubernetes Deployment

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: editorial-aggregator
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: editorial-aggregator
data:
  DATABASE_URL: "postgresql://user:pass@postgres:5432/editorial_news"
  REDIS_URL: "redis://redis:6379/0"
  # Add other non-sensitive config
---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: editorial-aggregator
type: Opaque
stringData:
  SECRET_KEY: "your-secret-key"
  OPENAI_API_KEY: "your-openai-key"
  # Add other sensitive data
```

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/
```

### Docker Swarm Deployment

```yaml
# docker-stack.yml
version: '3.8'
services:
  backend:
    image: editorial-aggregator/backend:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/editorial_news
    networks:
      - editorial-network

  frontend:
    image: editorial-aggregator/frontend:latest
    deploy:
      replicas: 2
    ports:
      - "80:80"
    networks:
      - editorial-network

networks:
  editorial-network:
    external: true
```

```bash
# Deploy stack
docker stack deploy -c docker-stack.yml editorial-stack
```

### Cloud Deployment (AWS/GCP/Azure)

#### AWS ECS with Fargate

```yaml
# ecs-task-definition.json
{
  "family": "editorial-aggregator",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-ecr-repo/backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "postgresql://..."
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/editorial-aggregator",
          "awslogs-region": "us-west-2"
        }
      }
    }
  ]
}
```

## API Configuration

### Essential Environment Variables

```bash
# Core Application
SECRET_KEY=your-super-secret-key-min-32-chars
ENVIRONMENT=production
DEBUG=false

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://host:port/db

# AI Services
OPENAI_API_KEY=sk-your-openai-key
HUGGINGFACE_API_TOKEN=hf_your-token
GOOGLE_TRANSLATE_API_KEY=your-google-key

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

### AI Model Configuration

#### OpenAI Models
```python
# Configure in app/core/config.py
OPENAI_MODELS = {
    'gpt-3.5-turbo': {
        'max_tokens': 4000,
        'cost_per_1k_tokens': 0.002,
        'quality': 'high'
    },
    'gpt-4': {
        'max_tokens': 8000,
        'cost_per_1k_tokens': 0.03,
        'quality': 'premium'
    }
}
```

#### Hugging Face Models
```python
HUGGINGFACE_MODELS = {
    'facebook/bart-large-cnn': {
        'task': 'summarization',
        'languages': ['en'],
        'max_length': 1024
    },
    'google/pegasus-xsum': {
        'task': 'summarization',
        'languages': ['en'],
        'max_length': 512
    }
}
```

### Rate Limiting Configuration

```python
RATE_LIMITS = {
    'api_requests_per_minute': 60,
    'scraping_delay': 1.0,  # seconds between requests
    'batch_size': 10,       # articles per batch
    'concurrent_requests': 5
}
```

## News Sources Configuration

### Adding New RSS Sources

```python
# In app/core/config.py
NEWS_SOURCES_CONFIG = {
    'english': {
        'new_source': {
            'name': 'New Source Name',
            'url': 'https://newssite.com',
            'rss_url': 'https://newssite.com/opinion/rss',
            'type': 'rss',
            'language': 'en',
            'category': 'editorial',
            'fetch_interval': 60,  # minutes
        }
    }
}
```

### Adding Scraping Sources

```python
'scraping_source': {
    'name': 'Scraping Source',
    'url': 'https://newssite.com/editorial',
    'type': 'scrape',
    'language': 'hi',
    'scraping_config': {
        'article_links': '.article-link',
        'title': 'h1.headline',
        'content': '.article-content',
        'author': '.byline',
        'date': '.publish-date',
        'next_page': '.pagination-next'
    }
}
```

### Regional Language Sources

```python
'hindi': {
    'hindustan_times_hindi': {
        'name': 'Hindustan Times Hindi',
        'url': 'https://www.hindustantimes.com/hindi',
        'rss_url': 'https://www.hindustantimes.com/feeds/rss/hindi/rssfeed.xml',
        'type': 'rss',
        'language': 'hi'
    }
},
'bengali': {
    'anandabazar': {
        'name': 'Anandabazar Patrika',
        'url': 'https://www.anandabazar.com',
        'rss_url': 'https://www.anandabazar.com/rss/editorial',
        'type': 'rss',
        'language': 'bn'
    }
}
```

### Custom Source Integration

```python
# app/scrapers/custom_scraper.py
from app.scrapers.base_scraper import BaseScraper

class CustomNewsScraper(BaseScraper):
    def __init__(self, source):
        super().__init__(source)
        self.base_url = source.url
    
    async def scrape_articles(self):
        articles = []
        # Implement custom scraping logic
        soup = await self.fetch_page(self.base_url)
        article_links = soup.select(self.source.scraping_config['article_links'])
        
        for link in article_links:
            article_url = urljoin(self.base_url, link.get('href'))
            article_data = await self.scrape_article_content(article_url)
            if article_data:
                articles.append(article_data)
        
        return articles
    
    async def scrape_article_content(self, url):
        soup = await self.fetch_page(url)
        
        return {
            'title': self.extract_text(soup, self.source.scraping_config['title']),
            'content': self.extract_text(soup, self.source.scraping_config['content']),
            'author': self.extract_text(soup, self.source.scraping_config['author']),
            'url': url,
            'published_date': self.parse_date(
                self.extract_text(soup, self.source.scraping_config['date'])
            )
        }
```

## Monitoring & Maintenance

### Health Checks

```python
# app/api/v1/health.py
@router.get("/health/detailed")
async def detailed_health_check():
    checks = {}
    
    # Database check
    try:
        db.execute("SELECT 1")
        checks['database'] = 'healthy'
    except Exception as e:
        checks['database'] = f'unhealthy: {str(e)}'
    
    # Redis check
    try:
        redis_client.ping()
        checks['redis'] = 'healthy'
    except Exception as e:
        checks['redis'] = f'unhealthy: {str(e)}'
    
    # External API checks
    checks['openai'] = await check_openai_api()
    checks['sources'] = await check_news_sources()
    
    overall_status = 'healthy' if all(
        status == 'healthy' for status in checks.values()
    ) else 'degraded'
    
    return {
        'status': overall_status,
        'checks': checks,
        'timestamp': datetime.utcnow()
    }
```

### Prometheus Metrics

```python
# app/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

article_processing_time = Histogram(
    'article_processing_seconds',
    'Time spent processing articles'
)

active_sources = Gauge(
    'active_news_sources',
    'Number of active news sources'
)

summarization_requests = Counter(
    'summarization_requests_total',
    'Total summarization requests',
    ['model', 'language']
)
```

### Log Configuration

```python
# app/core/logging.py
LOGGING_CONFIG = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'default': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        },
        'detailed': {
            'format': '%(asctime)s - %(name)s - %(levelname)s - %(module)s:%(lineno)d - %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'level': 'INFO',
            'formatter': 'default',
        },
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'level': 'DEBUG',
            'formatter': 'detailed',
            'filename': 'logs/app.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console', 'file'],
    },
}
```

### Automated Backups

```bash
#!/bin/bash
# scripts/backup.sh

# Database backup
pg_dump $DATABASE_URL | gzip > "backups/db_$(date +%Y%m%d_%H%M%S).sql.gz"

# Redis backup
redis-cli --rdb "backups/redis_$(date +%Y%m%d_%H%M%S).rdb"

# Upload to cloud storage
aws s3 cp backups/ s3://editorial-backups/ --recursive

# Cleanup old backups (keep 30 days)
find backups/ -type f -mtime +30 -delete
```

## Troubleshooting

### Common Issues

#### 1. Summarization Fails

**Problem**: AI summarization not working
**Solutions**:
```bash
# Check API keys
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Check model availability
docker-compose exec backend python -c "from transformers import AutoModel; AutoModel.from_pretrained('facebook/bart-large-cnn')"

# Check memory usage
docker stats
```

#### 2. RSS Feeds Not Updating

**Problem**: Articles not being fetched
**Solutions**:
```bash
# Check Celery workers
celery -A app.tasks.celery_app inspect active

# Test RSS feed manually
docker-compose exec backend python -c "
from app.services.rss_scraper import RSSScraperService
scraper = RSSScraperService()
result = scraper.validate_feed_url('https://example.com/rss')
print(result)
"

# Check source health
curl http://localhost:8000/api/v1/sources
```

#### 3. High Memory Usage

**Problem**: Application consuming too much memory
**Solutions**:
```python
# Optimize batch processing
SUMMARY_BATCH_SIZE = 2  # Reduce batch size
MAX_WORKERS = 2         # Limit concurrent workers

# Enable model quantization
MODEL_CONFIG = {
    'load_in_8bit': True,
    'device_map': 'auto'
}
```

#### 4. Database Performance Issues

**Solutions**:
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_articles_published_lang 
ON articles (published_date DESC, language);

CREATE INDEX CONCURRENTLY idx_articles_source_date 
ON articles (source_id, published_date DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM articles 
WHERE language = 'en' AND published_date >= NOW() - INTERVAL '7 days'
ORDER BY published_date DESC LIMIT 20;
```

### Performance Optimization

#### Database Optimization
```python
# Connection pooling
DATABASE_CONFIG = {
    'pool_size': 20,
    'max_overflow': 30,
    'pool_pre_ping': True,
    'pool_recycle': 300
}

# Query optimization
class ArticleRepository:
    def get_recent_articles(self, language: str, limit: int = 20):
        return self.session.query(Article)\
            .filter(Article.language == language)\
            .filter(Article.published_date >= datetime.utcnow() - timedelta(days=7))\
            .options(selectinload(Article.source))\
            .order_by(Article.published_date.desc())\
            .limit(limit).all()
```

#### Caching Strategy
```python
# Multi-level caching
@cached(ttl=300)  # 5 minutes
async def get_trending_articles(language: str):
    cache_key = f"trending:{language}"
    
    # Try Redis first
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from database
    articles = await fetch_trending_from_db(language)
    
    # Cache for next time
    await redis.setex(cache_key, 300, json.dumps(articles))
    
    return articles
```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** and add tests
4. **Run tests**: `pytest` and `npm test`
5. **Update documentation** if needed
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open Pull Request**

### Code Standards

#### Python Code Style
```python
# Use Black formatter
black --line-length 88 app/

# Use isort for imports
isort app/

# Type hints required
def process_article(article: Article) -> Dict[str, Any]:
    pass

# Docstrings for all functions
def summarize_text(text: str, model: str = "bart-large-cnn") -> str:
    """
    Summarize the given text using the specified model.
    
    Args:
        text: Input text to summarize
        model: Model name to use for summarization
        
    Returns:
        Summarized text
        
    Raises:
        ValueError: If text is empty or model is invalid
    """
```

#### TypeScript Code Style
```typescript
// Use ESLint + Prettier
npm run lint:fix
npm run format

// Proper typing
interface ArticleProps {
  article: Article;
  onSelect: (id: string) => void;
  className?: string;
}

// Component documentation
/**
 * ArticleCard component displays an article summary with actions
 * 
 * @param article - Article data to display
 * @param onSelect - Callback when article is selected
 * @param className - Additional CSS classes
 */
export const ArticleCard: React.FC<ArticleProps> = ({ article, onSelect, className }) => {
  // Component implementation
};
```

### Testing Guidelines

#### Backend Tests
```python
# pytest with fixtures
@pytest.fixture
def sample_article():
    return Article(
        title="Test Article",
        content="Test content",
        language="en",
        source_id=uuid.uuid4()
    )

def test_article_summarization(sample_article, summarization_service):
    result = summarization_service.summarize(sample_article)
    assert result.success
    assert len(result.summary) > 0
    assert result.summary != sample_article.content
```

#### Frontend Tests
```typescript
// Jest + React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { ArticleCard } from '../ArticleCard';

describe('ArticleCard', () => {
  const mockArticle = {
    id: '1',
    title: 'Test Article',
    summary: 'Test summary',
    // ... other props
  };

  it('renders article title', () => {
    render(<ArticleCard article={mockArticle} onSelect={jest.fn()} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(<ArticleCard article={mockArticle} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('article'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

---

## Support

For support and questions:
- **Documentation**: See `/docs` folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@editorial-aggregator.com

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.