from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import sys
sys.path.append('..')
from database import get_db
from ..models.srs import SRSProgress
from ..models.lemma import Lemma
from ..services.fsrs_algorithm import FSRSAlgorithm
from ..utils.security import decode_access_token, oauth2_scheme
from ..models.user import User
from fastapi import status

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
fsrs = FSRSAlgorithm()

class SRSItem(BaseModel):
    id: int
    user_id: int
    lemma_id: int
    lemma_text: str
    definition: Optional[str]
    interval: int
    stability: float
    difficulty: float
    due_date: datetime
    review_count: int
    state: str

class ReviewRequest(BaseModel):
    quality: int  # 0-5

class ReviewResponse(BaseModel):
    srs_item_id: int
    quality: int
    next_interval: int
    next_due_date: datetime
    stability: float
    difficulty: float
    state: str

class SRSStats(BaseModel):
    user_id: int
    total_reviews: int
    due_today: int
    learned_today: int
    streak_days: int
    total_items: int

@router.get("/due", response_model=List[SRSItem])
async def get_due_reviews(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get SRS items due for review."""
    user_id = current_user["user_id"]
    now = datetime.utcnow()
    
    # Get due items, ordered by due date (overdue first)
    due_items = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id,
        SRSProgress.due_date <= now
    ).order_by(SRSProgress.due_date).limit(limit).all()
    
    result = []
    for item in due_items:
        # Get lemma info
        lemma = db.query(Lemma).filter(Lemma.id == item.lemma_id).first()
        
        result.append(SRSItem(
            id=item.id,
            user_id=item.user_id,
            lemma_id=item.lemma_id,
            lemma_text=lemma.lemma if lemma else "Unknown",
            definition=lemma.definition if lemma else None,
            interval=item.interval,
            stability=item.stability,
            difficulty=item.difficulty,
            due_date=item.due_date,
            review_count=item.review_count,
            state=item.state
        ))
    
    return result

@router.post("/review/{srs_item_id}", response_model=ReviewResponse)
async def submit_review(
    srs_item_id: int,
    review_data: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Submit a review and update SRS item using FSRS algorithm."""
    quality = review_data.quality
    
    # Validate quality rating
    if not 0 <= quality <= 5:
        raise HTTPException(status_code=400, detail="Quality must be between 0 and 5")
    
    # Get SRS item
    srs_item = db.query(SRSProgress).filter(
        SRSProgress.id == srs_item_id,
        SRSProgress.user_id == current_user["user_id"]
    ).first()
    
    if not srs_item:
        raise HTTPException(status_code=404, detail="SRS item not found")
    
    # Calculate elapsed days
    if srs_item.last_review:
        elapsed_days = (datetime.utcnow() - srs_item.last_review).total_seconds() / 86400
    else:
        elapsed_days = 0.0
    
    # Calculate new parameters using FSRS
    new_params = fsrs.calculate_next_review(
        stability=srs_item.stability,
        difficulty=srs_item.difficulty,
        last_review=srs_item.last_review or datetime.utcnow(),
        quality=quality,
        elapsed_days=elapsed_days
    )
    
    # Update SRS item
    srs_item.stability = new_params["stability"]
    srs_item.difficulty = new_params["difficulty"]
    srs_item.interval = new_params["interval"]
    srs_item.due_date = new_params["due_date"]
    srs_item.review_count = srs_item.review_count + 1
    srs_item.last_review = datetime.utcnow()
    srs_item.last_quality = quality
    
    # Update state
    if quality >= 3:
        if srs_item.state == "new":
            srs_item.state = "learning"
        elif srs_item.state == "learning":
            srs_item.state = "review"
    else:
        srs_item.state = "relearning"
    
    db.commit()
    db.refresh(srs_item)
    
    return ReviewResponse(
        srs_item_id=srs_item.id,
        quality=quality,
        next_interval=srs_item.interval,
        next_due_date=srs_item.due_date,
        stability=srs_item.stability,
        difficulty=srs_item.difficulty,
        state=srs_item.state
    )

@router.post("/start/{lemma_id}", response_model=dict)
async def start_learning_lemma(
    lemma_id: int,
    book_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Create new SRS item for learning a lemma."""
    user_id = current_user["user_id"]
    
    # Check if lemma exists
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    # Check if SRS item already exists
    existing = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id,
        SRSProgress.lemma_id == lemma_id
    ).first()
    
    if existing:
        return {
            "srs_item_id": existing.id,
            "status": "already_learning",
            "message": "Already learning this word"
        }
    
    # Initialize new item
    initial_params = fsrs.initialize_new_item()
    
    new_item = SRSProgress(
        user_id=user_id,
        lemma_id=lemma_id,
        book_id=book_id,
        stability=initial_params["stability"],
        difficulty=initial_params["difficulty"],
        interval=initial_params["interval"],
        due_date=initial_params["due_date"],
        review_count=0,
        state="new"
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {
        "srs_item_id": new_item.id,
        "status": "learning_started",
        "due_date": new_item.due_date.isoformat()
    }

@router.get("/stats", response_model=SRSStats)
async def get_srs_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """Get SRS statistics for user."""
    user_id = current_user["user_id"]
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    
    # Total reviews
    total_reviews = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id
    ).count()
    
    # Due today
    due_today = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id,
        SRSProgress.due_date <= now
    ).count()
    
    # Learned today (items reviewed today)
    learned_today = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id,
        SRSProgress.last_review >= today_start
    ).count()
    
    # Total items
    total_items = db.query(SRSProgress).filter(
        SRSProgress.user_id == user_id
    ).count()
    
    # TODO: Calculate streak (requires daily review tracking)
    streak_days = 0
    
    return SRSStats(
        user_id=user_id,
        total_reviews=total_reviews,
        due_today=due_today,
        learned_today=learned_today,
        streak_days=streak_days,
        total_items=total_items
    )
