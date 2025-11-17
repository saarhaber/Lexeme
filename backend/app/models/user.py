from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Index
from .base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    language_level = Column(String(10), default="unknown")  # A1, A2, B1, B2, C1, C2
    preferences = Column(JSON, default=dict)  # User preferences as JSON

class UserVocabStatus(Base, TimestampMixin):
    __tablename__ = "user_vocab_status"
    __table_args__ = (
        Index("ix_user_vocab_status_user_lemma", "user_id", "lemma_id", unique=True),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lemma_id = Column(Integer, ForeignKey("lemmas.id"), nullable=False)
    status = Column(String(20), default="unknown")  # known, learning, unknown, ignored
    difficulty_rating = Column(Integer, default=0)  # User's perception of difficulty
