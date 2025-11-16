#!/usr/bin/env python3
"""
Database initialization script for Bookabulary
"""

from database import engine
from app.models import Base

def init_database():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_database()
