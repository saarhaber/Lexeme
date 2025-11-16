"""
Export functionality for vocabulary data.
Supports Anki, CSV, and PDF formats.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import csv
import io
import sys
sys.path.append('..')
from database import get_db
from ..models.lemma import Lemma
from ..models.book import Book
from ..models.user import UserVocabStatus, User
from ..utils.security import decode_access_token, oauth2_scheme

router = APIRouter()

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

@router.get("/anki/{book_id}")
async def export_anki(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Export vocabulary to Anki format (CSV)."""
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.user_id == current_user["user_id"]
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Get vocabulary for this book
    # This is simplified - in production, you'd join with tokens/lemmas properly
    lemmas = db.query(Lemma).filter(Lemma.language == book.language).limit(500).all()
    
    # Create CSV in Anki format
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Anki format: Front, Back, Tags
    writer.writerow(['Front', 'Back', 'Tags'])
    
    for lemma in lemmas:
        front = lemma.lemma
        back = lemma.definition or "No definition"
        tags = f"{book.language} {lemma.pos or 'unknown'}"
        writer.writerow([front, back, tags])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=book_{book_id}_anki.csv"
        }
    )

@router.get("/csv/{book_id}")
async def export_csv(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Export vocabulary to CSV format."""
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.user_id == current_user["user_id"]
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    lemmas = db.query(Lemma).filter(Lemma.language == book.language).limit(500).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # CSV headers
    writer.writerow(['Word', 'Definition', 'Part of Speech', 'Frequency', 'Difficulty'])
    
    for lemma in lemmas:
        writer.writerow([
            lemma.lemma,
            lemma.definition or "",
            lemma.pos or "",
            lemma.global_frequency or 0,
            lemma.difficulty_level or 0
        ])
    
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=book_{book_id}_vocabulary.csv"
        }
    )

@router.get("/json/{book_id}")
async def export_json(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Export vocabulary to JSON format."""
    import json
    
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.user_id == current_user["user_id"]
    ).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    lemmas = db.query(Lemma).filter(Lemma.language == book.language).limit(500).all()
    
    vocabulary_data = {
        "book_id": book_id,
        "book_title": book.title,
        "language": book.language,
        "vocabulary": [
            {
                "lemma": lemma.lemma,
                "definition": lemma.definition,
                "pos": lemma.pos,
                "frequency": lemma.global_frequency,
                "difficulty": lemma.difficulty_level
            }
            for lemma in lemmas
        ]
    }
    
    json_str = json.dumps(vocabulary_data, indent=2, ensure_ascii=False)
    
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=book_{book_id}_vocabulary.json"
        }
    )

