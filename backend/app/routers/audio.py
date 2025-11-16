"""
Audio pronunciation endpoints using TTS (Text-to-Speech).
"""
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import sys
sys.path.append('..')
from database import get_db
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

class AudioRequest(BaseModel):
    text: str
    language: str = "en"

@router.get("/pronounce/{lemma_id}")
async def get_pronunciation(
    lemma_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get audio pronunciation for a lemma."""
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    # TODO: Implement actual TTS
    # For now, return a placeholder response
    # In production, use:
    # - Google Cloud Text-to-Speech API
    # - Amazon Polly
    # - Azure Cognitive Services Speech
    # - Or browser Web Speech API (client-side)
    
    return {
        "lemma_id": lemma_id,
        "lemma": lemma.lemma,
        "language": lemma.language,
        "audio_url": None,  # TODO: Generate TTS audio
        "message": "Audio pronunciation coming soon. Use browser TTS for now."
    }

@router.post("/pronounce-text")
async def pronounce_text(
    request: AudioRequest,
    current_user: dict = Depends(get_current_user_real)
):
    """Get pronunciation for arbitrary text."""
    # TODO: Implement TTS
    return {
        "text": request.text,
        "language": request.language,
        "audio_url": None,
        "message": "Audio pronunciation coming soon"
    }

