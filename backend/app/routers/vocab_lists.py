"""
Vocabulary lists endpoints for user-created collections.
"""
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import sys
sys.path.append('..')
from database import get_db
from ..models.vocab_list import VocabList, vocab_list_items
from ..models.lemma import Lemma
from ..models.user import User
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

class VocabListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = False

class VocabListResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_public: bool
    word_count: int
    created_at: str

class AddWordRequest(BaseModel):
    lemma_id: int

@router.post("/", response_model=VocabListResponse)
async def create_vocab_list(
    list_data: VocabListCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Create a new vocabulary list."""
    new_list = VocabList(
        user_id=current_user["user_id"],
        name=list_data.name,
        description=list_data.description,
        is_public=1 if list_data.is_public else 0,
        word_count=0
    )
    
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    
    return VocabListResponse(
        id=new_list.id,
        name=new_list.name,
        description=new_list.description,
        is_public=bool(new_list.is_public),
        word_count=new_list.word_count,
        created_at=new_list.created_at.isoformat() if hasattr(new_list, 'created_at') else ''
    )

@router.get("/", response_model=List[VocabListResponse])
async def get_user_lists(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get all vocabulary lists for the current user."""
    lists = db.query(VocabList).filter(
        VocabList.user_id == current_user["user_id"]
    ).all()
    
    return [
        VocabListResponse(
            id=lst.id,
            name=lst.name,
            description=lst.description,
            is_public=bool(lst.is_public),
            word_count=lst.word_count,
            created_at=lst.created_at.isoformat() if hasattr(lst, 'created_at') else ''
        )
        for lst in lists
    ]

@router.get("/{list_id}", response_model=VocabListResponse)
async def get_vocab_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get a specific vocabulary list."""
    vocab_list = db.query(VocabList).filter(
        VocabList.id == list_id,
        VocabList.user_id == current_user["user_id"]
    ).first()
    
    if not vocab_list:
        raise HTTPException(status_code=404, detail="Vocabulary list not found")
    
    return VocabListResponse(
        id=vocab_list.id,
        name=vocab_list.name,
        description=vocab_list.description,
        is_public=bool(vocab_list.is_public),
        word_count=vocab_list.word_count,
        created_at=vocab_list.created_at.isoformat() if hasattr(vocab_list, 'created_at') else ''
    )

@router.post("/{list_id}/words", response_model=dict)
async def add_word_to_list(
    list_id: int,
    word_data: AddWordRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Add a word to a vocabulary list."""
    vocab_list = db.query(VocabList).filter(
        VocabList.id == list_id,
        VocabList.user_id == current_user["user_id"]
    ).first()
    
    if not vocab_list:
        raise HTTPException(status_code=404, detail="Vocabulary list not found")
    
    # Check if lemma exists
    lemma = db.query(Lemma).filter(Lemma.id == word_data.lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    # Check if word already in list
    from sqlalchemy import select
    existing = db.execute(
        select(vocab_list_items).where(
            vocab_list_items.c.list_id == list_id,
            vocab_list_items.c.lemma_id == word_data.lemma_id
        )
    ).first()
    
    if existing:
        # Word already in list, return current count
        return {
            "message": "Word already in list",
            "list_id": list_id,
            "lemma_id": word_data.lemma_id,
            "word_count": vocab_list.word_count
        }
    
    # Insert into association table
    db.execute(
        vocab_list_items.insert().values(
            list_id=list_id,
            lemma_id=word_data.lemma_id
        )
    )
    
    # Update word count
    vocab_list.word_count += 1
    db.commit()
    
    return {
        "message": "Word added to list",
        "list_id": list_id,
        "lemma_id": word_data.lemma_id,
        "word_count": vocab_list.word_count
    }

@router.get("/{list_id}/vocabulary")
async def get_list_vocabulary(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get vocabulary items in a vocabulary list."""
    vocab_list = db.query(VocabList).filter(
        VocabList.id == list_id,
        VocabList.user_id == current_user["user_id"]
    ).first()
    
    if not vocab_list:
        raise HTTPException(status_code=404, detail="Vocabulary list not found")
    
    # Get lemmas in this list using the association table
    from sqlalchemy import select
    stmt = select(Lemma).join(vocab_list_items).where(
        vocab_list_items.c.list_id == list_id
    )
    lemmas = db.execute(stmt).scalars().all()
    
    # Format response similar to vocabulary explorer
    vocabulary_items = []
    for lemma in lemmas:
        vocabulary_items.append({
            "lemma": {
                "id": lemma.id,
                "lemma": lemma.lemma,
                "language": lemma.language,
                "pos": lemma.pos,
                "definition": lemma.definition,
                "morphology": lemma.morphology or {},
                "global_frequency": lemma.global_frequency or 0.0
            },
            "frequency_in_book": 0,  # Not applicable for lists
            "difficulty_estimate": lemma.difficulty_level or 0.0,
            "status": "unknown",  # Default status
            "example_sentences": [],
            "collocations": []
        })
    
    return {
        "list_id": list_id,
        "list_name": vocab_list.name,
        "vocabulary": vocabulary_items,
        "total_count": len(vocabulary_items)
    }

@router.delete("/{list_id}")
async def delete_vocab_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Delete a vocabulary list."""
    vocab_list = db.query(VocabList).filter(
        VocabList.id == list_id,
        VocabList.user_id == current_user["user_id"]
    ).first()
    
    if not vocab_list:
        raise HTTPException(status_code=404, detail="Vocabulary list not found")
    
    db.delete(vocab_list)
    db.commit()
    
    return {"message": "Vocabulary list deleted successfully"}

