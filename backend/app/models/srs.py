from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from .base import Base, TimestampMixin

class SRSProgress(Base, TimestampMixin):
    __tablename__ = "srs_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lemma_id = Column(Integer, ForeignKey("lemmas.id"), nullable=False)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True)  # Optional: book context
    
    # FSRS algorithm parameters
    interval = Column(Integer, default=1)  # Days between reviews
    stability = Column(Float, default=0.4)  # Memory stability (FSRS)
    difficulty = Column(Float, default=0.3)  # Item difficulty (FSRS)
    ease = Column(Float, default=2.5)  # Legacy SM-2 ease factor (for compatibility)
    
    # Review tracking
    due_date = Column(DateTime, nullable=False)
    last_review = Column(DateTime, nullable=True)
    review_count = Column(Integer, default=0)
    last_quality = Column(Integer)  # Last review quality (0-5)
    state = Column(String(20), default="new")  # new, learning, review, relearning
