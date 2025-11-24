from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool, StaticPool
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bookabulary.db")

# Create engine with connection pooling for better performance
if DATABASE_URL.startswith("sqlite"):
    # SQLite: Use StaticPool for single-threaded, QueuePool for multi-threaded
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        pool_pre_ping=True,  # Verify connections before using
    )
else:
    # PostgreSQL/MySQL: Use connection pooling
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,  # Number of connections to maintain
        max_overflow=20,  # Max connections beyond pool_size
        pool_pre_ping=True,  # Verify connections before using
        pool_recycle=3600,  # Recycle connections after 1 hour
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
