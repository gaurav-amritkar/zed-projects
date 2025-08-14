import feedparser
import requests
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
import logging
import time
import re
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import hashlib

from app.core.config import settings
from app.models.article import Article
from app.models.source import Source

logger = logging.getLogger(__name__)


class RSSScraperService:
    """
    RSS feed scraper service for fetching editorial and opinion articles
    """

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': settings.USER_AGENT,
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        self.session.timeout = settings.REQUEST_TIMEOUT

    def fetch_feed(self, source: Source) -> Tuple[bool, List[Dict], Optional[str]]:
        """
        Fetch articles from RSS feed

        Args:
            source: Source object containing feed URL and configuration

        Returns:
            Tuple of (success, articles_data, error_message)
        """
        try:
            feed_url = source.fetch_url
            if not feed_url:
                return False, [], "No feed URL configured"

            logger.info(f"Fetching RSS feed: {feed_url}")

            # Add delay if configured
            if source.request_delay:
                time.sleep(source.request_delay)

            # Fetch the feed with retries
            feed_data = None
            last_error = None

            for attempt in range(settings.MAX_RETRIES):
                try:
                    # Use requests session for better control
                    response = self.session.get(feed_url, timeout=settings.REQUEST_TIMEOUT)
                    response.raise_for_status()

                    # Parse the feed
                    feed_data = feedparser.parse(response.content)

                    if feed_data.bozo:
                        logger.warning(f"Feed parsing warning for {feed_url}: {feed_data.bozo_exception}")

                    break

                except requests.exceptions.RequestException as e:
                    last_error = f"Request failed (attempt {attempt + 1}): {str(e)}"
                    logger.error(last_error)
                    if attempt < settings.MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)  # Exponential backoff
                    continue

                except Exception as e:
                    last_error = f"Unexpected error (attempt {attempt + 1}): {str(e)}"
                    logger.error(last_error)
                    if attempt < settings.MAX_RETRIES - 1:
                        time.sleep(2 ** attempt)
                    continue

            if not feed_data:
                return False, [], last_error or "Failed to fetch feed"

            # Extract articles from feed
            articles_data = self._extract_articles_from_feed(feed_data, source)

            # Filter editorial/opinion articles
            filtered_articles = self._filter_editorial_articles(articles_data, source)

            logger.info(f"Extracted {len(filtered_articles)} articles from {feed_url}")
            return True, filtered_articles, None

        except Exception as e:
            error_message = f"RSS scraping failed for {source.name}: {str(e)}"
            logger.error(error_message)
            return False, [], error_message

    def _extract_articles_from_feed(self, feed_data, source: Source) -> List[Dict]:
        """
        Extract article data from parsed RSS feed

        Args:
            feed_data: Parsed RSS feed data
            source: Source object

        Returns:
            List of article dictionaries
        """
        articles = []

        try:
            # Process each entry in the feed
            for entry in feed_data.entries[:source.max_articles_per_fetch]:
                try:
                    article_data = self._extract_article_data(entry, source)
                    if article_data:
                        articles.append(article_data)
                except Exception as e:
                    logger.error(f"Error extracting article from entry: {str(e)}")
                    continue

        except Exception as e:
            logger.error(f"Error processing feed entries: {str(e)}")

        return articles

    def _extract_article_data(self, entry, source: Source) -> Optional[Dict]:
        """
        Extract individual article data from RSS entry

        Args:
            entry: RSS feed entry
            source: Source object

        Returns:
            Article data dictionary or None
        """
        try:
            # Extract basic information
            title = self._clean_text(entry.get('title', ''))
            if not title:
                return None

            url = entry.get('link', '')
            if not url:
                return None

            # Extract publication date
            published_date = self._parse_date(entry)
            if not published_date:
                published_date = datetime.now(timezone.utc)

            # Extract content
            content = self._extract_content(entry)

            # Extract excerpt/summary
            excerpt = self._extract_excerpt(entry)

            # Extract author
            author = self._extract_author(entry)

            # Extract category
            category = self._extract_category(entry, source)

            # Generate content hash for duplicate detection
            content_hash = self._generate_content_hash(title, content)

            # Calculate word count
            word_count = len(content.split()) if content else 0

            # Extract image URL
            image_url = self._extract_image_url(entry)

            article_data = {
                'title': title,
                'url': url,
                'content': content,
                'excerpt': excerpt,
                'author': author,
                'category': category,
                'published_date': published_date,
                'language': source.language,
                'word_count': word_count,
                'image_url': image_url,
                'source_id': source.id,
                'content_hash': content_hash,
                'metadata': {
                    'rss_entry_id': entry.get('id', ''),
                    'rss_tags': [tag.get('term', '') for tag in entry.get('tags', [])],
                    'feed_title': entry.get('title_detail', {}).get('value', ''),
                }
            }

            return article_data

        except Exception as e:
            logger.error(f"Error extracting article data: {str(e)}")
            return None

    def _extract_content(self, entry) -> str:
        """Extract article content from RSS entry"""
        content = ""

        # Try different content fields in order of preference
        content_fields = [
            'content',
            'summary_detail',
            'summary',
            'description'
        ]

        for field in content_fields:
            if field in entry:
                field_data = entry[field]

                if isinstance(field_data, list) and field_data:
                    # Handle content as list (multiple content blocks)
                    content = ' '.join([item.get('value', '') for item in field_data])
                elif isinstance(field_data, dict):
                    # Handle content as dict with value field
                    content = field_data.get('value', '')
                else:
                    # Handle content as string
                    content = str(field_data)

                if content:
                    break

        # Clean HTML tags and normalize whitespace
        if content:
            content = self._clean_html_content(content)

        return content.strip()

    def _extract_excerpt(self, entry) -> str:
        """Extract article excerpt from RSS entry"""
        excerpt = ""

        # Try summary first, then description
        if 'summary' in entry:
            excerpt = entry['summary']
        elif 'description' in entry:
            excerpt = entry['description']

        if excerpt:
            excerpt = self._clean_html_content(excerpt)
            # Limit excerpt length
            if len(excerpt) > 300:
                excerpt = excerpt[:297] + "..."

        return excerpt.strip()

    def _extract_author(self, entry) -> Optional[str]:
        """Extract author from RSS entry"""
        author = None

        # Try different author fields
        if 'author' in entry:
            author = entry['author']
        elif 'author_detail' in entry:
            author_detail = entry['author_detail']
            author = author_detail.get('name', author_detail.get('email', ''))
        elif 'authors' in entry and entry['authors']:
            author = entry['authors'][0].get('name', '')

        return self._clean_text(author) if author else None

    def _extract_category(self, entry, source: Source) -> str:
        """Extract category from RSS entry"""
        # Default category
        category = 'editorial'

        # Check RSS tags/categories
        if 'tags' in entry:
            for tag in entry['tags']:
                tag_term = tag.get('term', '').lower()
                if any(keyword in tag_term for keyword in ['opinion', 'editorial', 'comment']):
                    if 'opinion' in tag_term:
                        category = 'opinion'
                    break

        # Check title for category indicators
        title_lower = entry.get('title', '').lower()
        if any(keyword in title_lower for keyword in ['opinion:', 'editorial:', 'comment:']):
            if 'opinion:' in title_lower:
                category = 'opinion'

        return category

    def _extract_image_url(self, entry) -> Optional[str]:
        """Extract image URL from RSS entry"""
        image_url = None

        # Try different image fields
        if 'media_content' in entry:
            media_content = entry['media_content']
            if isinstance(media_content, list) and media_content:
                # Get first image from media content
                for media in media_content:
                    if media.get('type', '').startswith('image/'):
                        image_url = media.get('url')
                        break

        if not image_url and 'enclosures' in entry:
            # Check enclosures for images
            for enclosure in entry['enclosures']:
                if enclosure.get('type', '').startswith('image/'):
                    image_url = enclosure.get('href')
                    break

        # Try to extract image from content
        if not image_url and 'content' in entry:
            content = entry['content']
            if isinstance(content, list) and content:
                content_html = content[0].get('value', '')
            else:
                content_html = str(content)

            # Parse HTML to find images
            soup = BeautifulSoup(content_html, 'html.parser')
            img_tag = soup.find('img')
            if img_tag and img_tag.get('src'):
                image_url = img_tag['src']

        return image_url

    def _parse_date(self, entry) -> Optional[datetime]:
        """Parse publication date from RSS entry"""
        date_fields = ['published_parsed', 'updated_parsed']

        for field in date_fields:
            if field in entry and entry[field]:
                try:
                    time_struct = entry[field]
                    return datetime(*time_struct[:6], tzinfo=timezone.utc)
                except (ValueError, TypeError):
                    continue

        # Try string date fields
        string_date_fields = ['published', 'updated']
        for field in string_date_fields:
            if field in entry and entry[field]:
                try:
                    # Try to parse various date formats
                    date_string = entry[field]
                    return self._parse_date_string(date_string)
                except Exception:
                    continue

        return None

    def _parse_date_string(self, date_string: str) -> Optional[datetime]:
        """Parse date string to datetime object"""
        # Common date formats
        date_formats = [
            '%a, %d %b %Y %H:%M:%S %Z',
            '%a, %d %b %Y %H:%M:%S %z',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S',
            '%d %b %Y %H:%M:%S',
        ]

        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_string, fmt)
                if parsed_date.tzinfo is None:
                    parsed_date = parsed_date.replace(tzinfo=timezone.utc)
                return parsed_date
            except ValueError:
                continue

        # Try using dateutil as fallback
        try:
            from dateutil import parser
            parsed_date = parser.parse(date_string)
            if parsed_date.tzinfo is None:
                parsed_date = parsed_date.replace(tzinfo=timezone.utc)
            return parsed_date
        except Exception:
            pass

        return None

    def _filter_editorial_articles(self, articles: List[Dict], source: Source) -> List[Dict]:
        """
        Filter articles to keep only editorial/opinion content

        Args:
            articles: List of article dictionaries
            source: Source object

        Returns:
            Filtered list of articles
        """
        filtered_articles = []

        for article in articles:
            if self._is_editorial_content(article, source):
                # Mark as editorial or opinion
                article['is_editorial'] = article.get('category') == 'editorial'
                article['is_opinion'] = article.get('category') == 'opinion'
                filtered_articles.append(article)

        return filtered_articles

    def _is_editorial_content(self, article: Dict, source: Source) -> bool:
        """
        Check if article is editorial/opinion content

        Args:
            article: Article dictionary
            source: Source object

        Returns:
            True if article is editorial content
        """
        title = article.get('title', '').lower()
        content = article.get('content', '').lower()
        category = article.get('category', '').lower()

        # Check category
        if category in ['editorial', 'opinion', 'comment']:
            return True

        # Check title for editorial indicators
        editorial_indicators = [
            'editorial:', 'opinion:', 'comment:', 'analysis:',
            'editorial -', 'opinion -', 'comment -',
            'our view:', 'editor\'s note:', 'editor\'s pick:',
        ]

        for indicator in editorial_indicators:
            if indicator in title:
                return True

        # Check for editorial keywords in title
        editorial_keywords = [
            'editorial', 'opinion', 'viewpoint', 'perspective',
            'commentary', 'analysis', 'our view', 'editor',
        ]

        # Title should contain editorial keywords
        title_has_editorial_keyword = any(keyword in title for keyword in editorial_keywords)

        # Check URL for editorial indicators
        url = article.get('url', '').lower()
        url_has_editorial = any(keyword in url for keyword in [
            'editorial', 'opinion', 'comment', 'viewpoint'
        ])

        # Apply keyword filters from source configuration
        if source.keyword_filters:
            keyword_match = any(keyword.lower() in title or keyword.lower() in content
                              for keyword in source.keyword_filters)
            if not keyword_match:
                return False

        # Apply exclude keywords
        if source.exclude_keywords:
            exclude_match = any(keyword.lower() in title or keyword.lower() in content
                               for keyword in source.exclude_keywords)
            if exclude_match:
                return False

        # Article is editorial if title or URL contains editorial keywords
        return title_has_editorial_keyword or url_has_editorial

    def _clean_html_content(self, html_content: str) -> str:
        """Clean HTML content to extract plain text"""
        if not html_content:
            return ""

        # Parse HTML with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get text and normalize whitespace
        text = soup.get_text()

        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)

        return text

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""

        # Remove HTML entities
        import html
        text = html.unescape(text)

        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)

        return text.strip()

    def _generate_content_hash(self, title: str, content: str) -> str:
        """Generate hash for duplicate detection"""
        # Combine title and first 500 chars of content
        combined = f"{title}{content[:500]}"
        return hashlib.md5(combined.encode('utf-8')).hexdigest()

    def validate_feed_url(self, url: str) -> Tuple[bool, Optional[str]]:
        """
        Validate RSS feed URL

        Args:
            url: RSS feed URL

        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            # Try to parse the feed
            feed_data = feedparser.parse(response.content)

            if feed_data.bozo and not feed_data.entries:
                return False, f"Invalid RSS feed format: {feed_data.bozo_exception}"

            if not feed_data.entries:
                return False, "RSS feed contains no entries"

            return True, None

        except requests.exceptions.RequestException as e:
            return False, f"Failed to fetch RSS feed: {str(e)}"
        except Exception as e:
            return False, f"RSS feed validation error: {str(e)}"

    def get_feed_info(self, url: str) -> Optional[Dict]:
        """
        Get basic information about RSS feed

        Args:
            url: RSS feed URL

        Returns:
            Feed information dictionary
        """
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            feed_data = feedparser.parse(response.content)

            if feed_data.bozo and not feed_data.entries:
                return None

            feed_info = {
                'title': feed_data.feed.get('title', ''),
                'description': feed_data.feed.get('description', ''),
                'link': feed_data.feed.get('link', ''),
                'language': feed_data.feed.get('language', 'en'),
                'updated': feed_data.feed.get('updated', ''),
                'entries_count': len(feed_data.entries),
                'generator': feed_data.feed.get('generator', ''),
            }

            return feed_info

        except Exception as e:
            logger.error(f"Error getting feed info: {str(e)}")
            return None
