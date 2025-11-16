"""
Vocabulary list models for user-created collections.
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Table
from .base import Base, TimestampMixin

# Association table for many-to-many relationship
vocab_list_items = Table(
    'vocab_list_items',
    Base.metadata,
    Column('list_id', Integer, ForeignKey('vocab_lists.id'), primary_key=True),
    Column('lemma_id', Integer, ForeignKey('lemmas.id'), primary_key=True)
)

class VocabList(Base, TimestampMixin):
    __tablename__ = "vocab_lists"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    is_public = Column(Integer, default=0)  # 0 = private, 1 = public
    word_count = Column(Integer, default=0)
    
    # Relationship will be defined in the model using relationship()

