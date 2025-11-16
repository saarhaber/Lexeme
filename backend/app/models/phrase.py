from sqlalchemy import Column, Integer, String, Text, Float, JSON, ForeignKey
from .base import Base

class Phrase(Base):
    __tablename__ = "phrases"

    id = Column(Integer, primary_key=True, index=True)
    phrase = Column(String(255), nullable=False, index=True)
    language = Column(String(10), nullable=False, index=True)
    confidence = Column(Float, default=0.0)  # Detection confidence
    example = Column(Text)  # Safe example sentence
    linked_lemmas = Column(JSON, default=list)  # Related lemma IDs
    phrase_type = Column(String(20))  # idiom, collocation, etc.

class GrammarPattern(Base):
    __tablename__ = "grammar_patterns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    pattern = Column(JSON, default=dict)  # Pattern definition
    linked_examples = Column(JSON, default=list)  # Safe examples
    language = Column(String(10), nullable=False)
    pattern_type = Column(String(50))  # tense, construction, syntax, etc.
