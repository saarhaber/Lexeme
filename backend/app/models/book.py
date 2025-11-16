from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Float
from .base import Base, TimestampMixin

class Book(Base, TimestampMixin):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255))
    language = Column(String(10), nullable=False)  # ISO language code
    upload_date = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(500))  # Path to uploaded file
    settings = Column(JSON, default=dict)  # Spoiler settings, etc.
    processing_status = Column(String(20), default="pending")  # pending, processing, completed, failed
    total_words = Column(Integer, default=0)
    unique_lemmas = Column(Integer, default=0)
    
    # Reading progress fields
    reading_progress = Column(Float, default=0.0)  # 0.0-1.0
    last_read_position = Column(Integer, default=0)  # Character position
    current_chapter = Column(Integer, default=0)
    total_chapters = Column(Integer, default=0)
    spoiler_safe_regions = Column(JSON, default=list)  # Safe character ranges for vocabulary

class RawText(Base):
    __tablename__ = "raw_text"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    chapter = Column(Integer, default=0)
    content = Column(Text, nullable=False)
    word_count = Column(Integer, default=0)
