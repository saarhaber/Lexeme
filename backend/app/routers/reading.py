"""
Reading mode endpoints for in-app book reading with vocabulary support.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import sys
sys.path.append('..')
from database import get_db
from ..models.book import Book, RawText
from ..models.reading_progress import ReadingProgress
from ..models.lemma import Lemma
from ..models.lemma import Token as TokenModel
from ..utils.security import decode_access_token, oauth2_scheme
from ..models.user import User

# Create proper dependency with db injection
def get_current_user_real(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Get current user with proper db injection."""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
    
    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "language_level": user.language_level
    }

router = APIRouter()

class WordDefinition(BaseModel):
    lemma: str
    definition: str
    pos: Optional[str] = None
    context_sentence: Optional[str] = None
    frequency: Optional[int] = None
    morphology: Optional[dict] = None

class ReadingTextResponse(BaseModel):
    text: str
    position: int
    total_length: int
    progress: float  # 0.0-1.0
    chapter: int
    safe_vocabulary_count: int

class WordLookupResponse(BaseModel):
    word: str
    definitions: List[WordDefinition]
    is_safe: bool  # Whether word is in safe (read) region

class ProgressUpdate(BaseModel):
    position: int
    chapter: Optional[int] = None

@router.get("/book/{book_id}/text", response_model=ReadingTextResponse)
async def get_reading_text(
    book_id: int,
    position: Optional[int] = None,
    length: int = 2000,  # Characters to return
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get book text for reading mode, starting from user's last position."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get reading progress for the authenticated user
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user["user_id"],
        ReadingProgress.book_id == book_id
    ).first()
    
    # Determine start position
    if position is not None:
        start_pos = position
    elif progress:
        start_pos = progress.character_position
    else:
        start_pos = 0
    
    # Get raw text
    raw_text = db.query(RawText).filter(RawText.book_id == book_id).first()
    if not raw_text:
        raise HTTPException(status_code=404, detail="Book text not found")
    
    text_content = raw_text.content
    total_length = len(text_content)
    
    # Get text segment
    end_pos = min(start_pos + length, total_length)
    text_segment = text_content[start_pos:end_pos]
    
    # Calculate progress
    progress_ratio = start_pos / total_length if total_length > 0 else 0.0
    
    # Count safe vocabulary (words user has already read)
    safe_window = progress.safe_vocabulary_window if progress else 1000
    safe_end = min(start_pos + safe_window, total_length)
    safe_text = text_content[:safe_end]
    
    # Simple word count in safe region
    safe_words = len(set(safe_text.lower().split()))
    
    return ReadingTextResponse(
        text=text_segment,
        position=start_pos,
        total_length=total_length,
        progress=progress_ratio,
        chapter=progress.chapter if progress else 0,
        safe_vocabulary_count=safe_words
    )

@router.get("/book/{book_id}/word/{word}", response_model=WordLookupResponse)
async def lookup_word(
    book_id: int,
    word: str,
    position: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Look up word definition, ensuring it's in safe (read) region."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get reading progress
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user["user_id"],
        ReadingProgress.book_id == book_id
    ).first()
    
    # Determine safe region
    if progress:
        safe_end = progress.character_position + (progress.safe_vocabulary_window or 1000)
    else:
        safe_end = 1000
    
    # Get raw text to check position
    raw_text = db.query(RawText).filter(RawText.book_id == book_id).first()
    if not raw_text:
        raise HTTPException(status_code=404, detail="Book text not found")
    
    # Check if word position is safe
    word_lower = word.lower()
    is_safe = True
    
    if position is not None:
        is_safe = position <= safe_end
    
    # Find lemma definitions
    lemma = db.query(Lemma).filter(
        Lemma.lemma.ilike(word_lower),
        Lemma.language == book.language
    ).first()
    
    definitions = []
    if lemma:
        # Get context sentences (simplified - tokens may not exist yet)
        context_sentences = []
        # Try to find context in raw text if available
        raw_text = db.query(RawText).filter(RawText.book_id == book_id).first()
        if raw_text:
            tokens = db.query(TokenModel).filter(
                TokenModel.book_id == book_id,
                TokenModel.lemma_id == lemma.id
            ).limit(3).all()
            
            for token in tokens:
                if token.sentence_context and token.position <= safe_end:
                    context_sentences.append(token.sentence_context)
        
        definitions.append(WordDefinition(
            lemma=lemma.lemma,
            definition=lemma.definition or "No definition available",
            pos=lemma.pos,
            context_sentence=context_sentences[0] if context_sentences else None,
            frequency=lemma.global_frequency,
            morphology=lemma.morphology or {}
        ))
    else:
        # No lemma found, return basic info
        definitions.append(WordDefinition(
            lemma=word,
            definition="Word not found in vocabulary database",
            pos=None
        ))
    
    return WordLookupResponse(
        word=word,
        definitions=definitions,
        is_safe=is_safe
    )

@router.post("/book/{book_id}/progress", response_model=dict)
async def update_reading_progress(
    book_id: int,
    progress_data: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Update user's reading progress."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get or create reading progress
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user["user_id"],
        ReadingProgress.book_id == book_id
    ).first()
    
    if not progress:
        progress = ReadingProgress(
            user_id=current_user["user_id"],
            book_id=book_id,
            character_position=progress_data.position,
            chapter=progress_data.chapter or 0
        )
        db.add(progress)
    else:
        progress.character_position = progress_data.position
        if progress_data.chapter is not None:
            progress.chapter = progress_data.chapter
    
    # Update book progress
    raw_text = db.query(RawText).filter(RawText.book_id == book_id).first()
    if raw_text:
        total_length = len(raw_text.content)
        if total_length > 0:
            book.reading_progress = progress_data.position / total_length
            book.last_read_position = progress_data.position
    
    db.commit()
    
    return {
        "message": "Progress updated",
        "position": progress_data.position,
        "progress": book.reading_progress
    }

@router.get("/book/{book_id}/progress", response_model=dict)
async def get_reading_progress(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get user's reading progress for a book."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user["user_id"],
        ReadingProgress.book_id == book_id
    ).first()
    
    if not progress:
        return {
            "position": 0,
            "progress": 0.0,
            "chapter": 0,
            "words_read": 0
        }
    
    return {
        "position": progress.character_position,
        "progress": book.reading_progress or 0.0,
        "chapter": progress.chapter,
        "words_read": progress.words_read,
        "vocabulary_encountered": progress.vocabulary_encountered
    }

