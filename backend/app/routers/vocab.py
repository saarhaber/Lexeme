from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import sys
sys.path.append('..')
from database import get_db
from ..models.lemma import Lemma, Token
from ..models.user import UserVocabStatus

router = APIRouter()

class LemmaResponse(BaseModel):
    id: int
    lemma: str
    language: str
    pos: str
    definition: str
    morphology: dict
    global_frequency: float

class VocabularyItem(BaseModel):
    lemma: LemmaResponse
    frequency_in_book: int
    difficulty_estimate: float
    status: str  # known, learning, unknown, ignored
    example_sentences: List[str]
    collocations: List[str]

class VocabularyResponse(BaseModel):
    book_id: int
    vocabulary: List[VocabularyItem]
    total_count: int
    page: int
    limit: int
    sort_by: str
    filter_status: Optional[str]

@router.get("/book/{book_id}", response_model=VocabularyResponse)
async def get_book_vocabulary(
    book_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    sort_by: str = Query("frequency", regex="^(frequency|alphabetical|chronological)$"),
    filter_status: Optional[str] = Query(None, regex="^(known|learning|unknown|ignored)$"),
    chapter: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    # Check if book exists and is processing - allow partial results
    from ..models.book import Book
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Start with base query - filter by book_id through tokens
    # This will return empty if processing hasn't created tokens yet, which is fine
    # Vocabulary appears incrementally as batches are committed
    query = db.query(Lemma).join(Token).filter(Token.book_id == book_id)
    
    # Filter by chapter if specified
    if chapter is not None:
        query = query.filter(Token.chapter == chapter)
    
    query = query.distinct()
    
    # Apply sorting FIRST
    if sort_by == "frequency":
        query = query.order_by(desc(Lemma.global_frequency))
    elif sort_by == "alphabetical":
        query = query.order_by(Lemma.lemma)
    else:  # chronological (by lemma ID, which reflects insertion order)
        query = query.order_by(desc(Lemma.id))
    
    # Get total count before pagination
    total_count = query.count()
    
    # THEN apply limit and offset
    query = query.limit(limit).offset((page - 1) * limit)
    
    lemmas = query.all()
    
    # Convert to response format
    vocabulary = []
    # Get user_id from context (default to 1 for now)
    user_id = 1  # TODO: Get from auth context
    
    for lemma in lemmas:
        # Get user status (for now, default to unknown)
        user_status = db.query(UserVocabStatus).filter(
            UserVocabStatus.lemma_id == lemma.id,
            UserVocabStatus.user_id == user_id
        ).first()
        
        # Count frequency in this specific book
        frequency_in_book = db.query(Token).filter(
            Token.lemma_id == lemma.id,
            Token.book_id == book_id
        ).count()
        
        vocabulary_item = VocabularyItem(
            lemma=LemmaResponse(
                id=lemma.id,
                lemma=lemma.lemma,
                language=lemma.language,
                pos=lemma.pos or "",
                definition=lemma.definition or "",
                morphology=lemma.morphology or {},
                global_frequency=lemma.global_frequency or 0.0
            ),
            frequency_in_book=frequency_in_book,
            difficulty_estimate=0.0,  # Remove difficulty
            status=user_status.status if user_status else "unknown",
            example_sentences=[],  # TODO: Add example sentences
            collocations=[]  # TODO: Add collocations
        )
        vocabulary.append(vocabulary_item)
    
    return VocabularyResponse(
        book_id=book_id,
        vocabulary=vocabulary,
        total_count=total_count,
        page=page,
        limit=limit,
        sort_by=sort_by,
        filter_status=filter_status
    )

@router.get("/lemma/{lemma_id}")
async def get_lemma_details(lemma_id: int, db: Session = Depends(get_db)):
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    user_status = db.query(UserVocabStatus).filter(
        UserVocabStatus.lemma_id == lemma_id
    ).first()
    
    return {
        "lemma": {
            "id": lemma.id,
            "lemma": lemma.lemma,
            "language": lemma.language,
            "pos": lemma.pos or "",
            "definition": lemma.definition or "",
            "morphology": lemma.morphology or {},
            "global_frequency": lemma.global_frequency or 0.0
        },
        "frequency_in_book": int(lemma.global_frequency),
        "status": user_status.status if user_status else "unknown",
        "example_sentences": [],
        "collocations": []
    }

@router.put("/status/{lemma_id}")
async def update_vocab_status(
    lemma_id: int, 
    status_data: dict,
    db: Session = Depends(get_db),
    current_user: dict = Depends(lambda: {"user_id": 1})  # TODO: Proper auth
):
    # Check if lemma exists
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    status = status_data.get("status", "unknown")
    user_id = current_user.get("user_id", 1)
    
    # Update or create user vocabulary status
    user_status = db.query(UserVocabStatus).filter(
        UserVocabStatus.lemma_id == lemma_id,
        UserVocabStatus.user_id == user_id
    ).first()
    
    if user_status:
        user_status.status = status
    else:
        user_status = UserVocabStatus(
            lemma_id=lemma_id,
            user_id=user_id,
            status=status
        )
        db.add(user_status)
    
    db.commit()
    
    return {
        "lemma_id": lemma_id,
        "user_id": user_id,
        "status": status,
        "updated": True
    }

@router.get("/book/{book_id}/count")
async def get_book_vocabulary_count(book_id: int, db: Session = Depends(get_db)):
    """Get the total count of vocabulary items for a book."""
    count = db.query(Lemma).join(Token).filter(Token.book_id == book_id).distinct().count()
    return {
        "book_id": book_id,
        "total_count": count
    }

@router.get("/book/{book_id}/chapters")
async def get_book_chapters(book_id: int, db: Session = Depends(get_db)):
    """Get list of available chapters for a book."""
    chapters = db.query(Token.chapter).filter(
        Token.book_id == book_id
    ).distinct().order_by(Token.chapter).all()
    
    chapter_list = [ch[0] for ch in chapters if ch[0] is not None]
    
    # Get chapter word counts
    chapter_counts = {}
    for chapter_num in chapter_list:
        count = db.query(func.count(Token.id)).filter(
            Token.book_id == book_id,
            Token.chapter == chapter_num
        ).scalar()
        chapter_counts[chapter_num] = count
    
    return {
        "book_id": book_id,
        "chapters": chapter_list,
        "chapter_word_counts": chapter_counts,
        "total_chapters": len(chapter_list)
    }

@router.get("/search")
async def search_vocabulary(
    query: str = Query(..., min_length=1),
    language: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    search_query = db.query(Lemma).filter(Lemma.lemma.ilike(f"%{query}%"))
    
    if language:
        search_query = search_query.filter(Lemma.language == language)
    
    results = search_query.limit(limit).all()
    
    vocabulary_results = []
    for lemma in results:
        user_status = db.query(UserVocabStatus).filter(
            UserVocabStatus.lemma_id == lemma.id
        ).first()
        
        vocabulary_item = VocabularyItem(
            lemma=LemmaResponse(
                id=lemma.id,
                lemma=lemma.lemma,
                language=lemma.language,
                pos=lemma.pos or "",
                definition=lemma.definition or "",
                morphology=lemma.morphology or {},
                global_frequency=lemma.global_frequency or 0.0
            ),
            frequency_in_book=int(lemma.global_frequency or 0),
            difficulty_estimate=0.0,
            status=user_status.status if user_status else "unknown",
            example_sentences=[],
            collocations=[]
        )
        vocabulary_results.append(vocabulary_item)
    
    return {
        "query": query,
        "language": language,
        "results": vocabulary_results,
        "total_found": len(vocabulary_results)
    }
