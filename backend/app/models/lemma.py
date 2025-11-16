from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey
from .base import Base

class Lemma(Base):
    __tablename__ = "lemmas"

    id = Column(Integer, primary_key=True, index=True)
    lemma = Column(String(100), nullable=False, index=True)
    language = Column(String(10), nullable=False, index=True)
    pos = Column(String(20))  # Part of speech
    definition = Column(Text)
    morphology = Column(JSON, default=dict)  # Morphological forms
    global_frequency = Column(Float, default=0.0)  # Global frequency score
    difficulty_level = Column(Float, default=0.0)  # Difficulty estimate

class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    lemma_id = Column(Integer, ForeignKey("lemmas.id"), nullable=False)
    position = Column(Integer, nullable=False)  # Position in text
    chapter = Column(Integer, default=0)
    original_token = Column(String(100), nullable=False)
    sentence_context = Column(Text)  # Surrounding sentence for context
