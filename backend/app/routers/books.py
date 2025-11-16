from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import sys
sys.path.append('..')
from database import get_db
from ..models.book import Book, RawText
from ..models.lemma import Token
from ..models.srs import SRSProgress
from ..models.reading_progress import ReadingProgress

router = APIRouter()

class BookResponse(BaseModel):
    id: int
    title: str
    author: Optional[str]
    language: str
    upload_date: str
    user_id: int
    processing_status: str
    total_words: int
    unique_lemmas: int

class BookSummary(BaseModel):
    total_words: int
    unique_lemmas: int
    idioms_detected: int
    grammar_patterns_detected: int
    estimated_difficulty: str

@router.get("/", response_model=List[BookResponse])
async def get_books(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """Get all books. If user_id is provided, filters by user_id. Otherwise returns all books."""
    query = db.query(Book)
    if user_id:
        query = query.filter(Book.user_id == user_id)
    else:
        # If no user_id provided, return ALL books (useful for debugging and when auth isn't set up)
        print(f"[Books API] Loading all books (no user_id filter)")

    books = query.order_by(Book.upload_date.desc()).all()
    print(f"[Books API] Found {len(books)} books")
    
    result = [
        BookResponse(
            id=book.id,
            title=book.title,
            author=book.author,
            language=book.language,
            upload_date=book.upload_date.isoformat(),
            user_id=book.user_id,
            processing_status=book.processing_status or "pending",
            total_words=book.total_words or 0,
            unique_lemmas=book.unique_lemmas or 0
        )
        for book in books
    ]
    
    print(f"[Books API] Returning {len(result)} books")
    return result

@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: int, db: Session = Depends(get_db)):
    """Get specific book details"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Convert to dict and then to response model for better performance
    book_dict = {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "language": book.language,
        "upload_date": book.upload_date.isoformat(),
        "user_id": book.user_id,
        "processing_status": book.processing_status,
        "total_words": book.total_words or 0,
        "unique_lemmas": book.unique_lemmas or 0
    }

    return book_dict

@router.get("/{book_id}/summary", response_model=BookSummary)
async def get_book_summary(book_id: int, db: Session = Depends(get_db)):
    """Get book processing summary"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # TODO: Calculate actual statistics from processed data
    return BookSummary(
        total_words=book.total_words or 0,
        unique_lemmas=book.unique_lemmas or 0,
        idioms_detected=0,  # TODO: implement idiom detection
        grammar_patterns_detected=0,  # TODO: implement grammar pattern detection
        estimated_difficulty="Intermediate"  # TODO: implement difficulty estimation
    )

@router.delete("/{book_id}")
async def delete_book(book_id: int, db: Session = Depends(get_db)):
    """Delete book and all associated data"""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    book_title = book.title

    # Delete associated data in correct order (respecting foreign key constraints)
    # 1. Delete tokens (references book_id)
    db.query(Token).filter(Token.book_id == book_id).delete()
    
    # 2. Delete raw text (references book_id)
    db.query(RawText).filter(RawText.book_id == book_id).delete()
    
    # 3. Delete reading progress (references book_id)
    db.query(ReadingProgress).filter(ReadingProgress.book_id == book_id).delete()
    
    # 4. Delete SRS progress entries for this book (book_id is optional, but delete if present)
    db.query(SRSProgress).filter(SRSProgress.book_id == book_id).delete()

    # 5. Delete the file if it exists
    if book.file_path and os.path.exists(book.file_path):
        try:
            os.remove(book.file_path)
        except OSError as e:
            # Log error but don't fail the deletion
            print(f"Warning: Could not delete file {book.file_path}: {e}")

    # 6. Finally, delete the book itself
    db.delete(book)
    db.commit()

    return {"message": f"Book '{book_title}' and all associated data deleted successfully"}
