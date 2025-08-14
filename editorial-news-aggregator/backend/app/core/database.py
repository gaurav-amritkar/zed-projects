from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
import logging
from typing import Generator

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections every 5 minutes
    # For SQLite compatibility (if needed for development)
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in settings.DATABASE_URL else None,
)

# Create SessionLocal class
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create Base class for models
Base = declarative_base()

# Metadata for migrations
metadata = MetaData()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session

    Yields:
        Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database - create all tables
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


def check_db_connection() -> bool:
    """
    Check database connection health

    Returns:
        bool: True if connection is healthy
    """
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False


class DatabaseManager:
    """
    Database connection manager for advanced operations
    """

    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal

    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()

    def close_session(self, session: Session) -> None:
        """Close database session safely"""
        try:
            session.close()
        except Exception as e:
            logger.error(f"Error closing session: {e}")

    def execute_raw_query(self, query: str, params: dict = None) -> list:
        """
        Execute raw SQL query

        Args:
            query: SQL query string
            params: Query parameters

        Returns:
            list: Query results
        """
        session = self.get_session()
        try:
            result = session.execute(query, params or {})
            return result.fetchall()
        except Exception as e:
            logger.error(f"Raw query execution failed: {e}")
            session.rollback()
            raise
        finally:
            self.close_session(session)

    def bulk_insert(self, model_class, data: list) -> None:
        """
        Bulk insert data

        Args:
            model_class: SQLAlchemy model class
            data: List of dictionaries with data to insert
        """
        session = self.get_session()
        try:
            session.bulk_insert_mappings(model_class, data)
            session.commit()
            logger.info(f"Bulk inserted {len(data)} records")
        except Exception as e:
            logger.error(f"Bulk insert failed: {e}")
            session.rollback()
            raise
        finally:
            self.close_session(session)

    def bulk_update(self, model_class, data: list) -> None:
        """
        Bulk update data

        Args:
            model_class: SQLAlchemy model class
            data: List of dictionaries with data to update
        """
        session = self.get_session()
        try:
            session.bulk_update_mappings(model_class, data)
            session.commit()
            logger.info(f"Bulk updated {len(data)} records")
        except Exception as e:
            logger.error(f"Bulk update failed: {e}")
            session.rollback()
            raise
        finally:
            self.close_session(session)


# Global database manager instance
db_manager = DatabaseManager()
