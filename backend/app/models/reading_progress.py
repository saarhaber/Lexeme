"""
Reading progress model for tracking user reading position per book.
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text
from .base import Base, TimestampMixin

class ReadingProgress(Base, TimestampMixin):
    __tablename__ = "reading_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    
    # Position tracking
    character_position = Column(Integer, default=0)  # Character position in book text
    chapter = Column(Integer, default=0)
    paragraph = Column(Integer, default=0)
    
    # Progress metrics
    words_read = Column(Integer, default=0)
    vocabulary_encountered = Column(Integer, default=0)  # Number of unique words seen
    
    # Last read context (for spoiler prevention)
    last_sentence = Column(Text)  # Last sentence read (for context)
    safe_vocabulary_window = Column(Integer, default=1000)  # Characters ahead considered safe

