from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, status
from pydantic import BaseModel
from typing import List, Optional, Tuple, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, distinct, or_
import sys
sys.path.append('..')
from database import get_db
from ..models.lemma import Lemma, Token
from ..models.book import Book
from ..models.user import User, UserVocabStatus
from ..services.dictionary_service import DictionaryService
from ..utils.security import decode_access_token, oauth2_scheme

router = APIRouter()
dictionary_service = DictionaryService()


def get_current_user_real(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Authenticate the current user via JWT."""
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

MORPHOLOGY_EXCLUDE_KEYS = {
    'forms', 'form_count', 'root', 'prefixes', 'suffixes', 'derivations', 'inflections'
}
STATUS_LEARNED_VALUES = {"learned", "known", "mastered"}
STATUS_UNKNOWN_VALUES = {"unknown", "learning", "new"}
ALLOWED_STATUS_INPUTS = STATUS_LEARNED_VALUES.union(STATUS_UNKNOWN_VALUES).union({"ignored"})


def _has_substantive_grammar(morphology: Any) -> bool:
    if not isinstance(morphology, dict):
        return False
    for key in morphology.keys():
        if key not in MORPHOLOGY_EXCLUDE_KEYS:
            return True
    return False


def _format_morphology(existing: Any) -> dict:
    if isinstance(existing, dict):
        return dict(existing)
    return {}


def _enrich_lemma_if_needed(lemma: Lemma) -> Tuple[str, dict, str, bool]:
    """
    Ensure lemma has translation/grammar data. Returns tuple of
    (definition, morphology, pos, updated_flag).
    """
    definition = (lemma.definition or "").strip()
    morphology = _format_morphology(lemma.morphology)
    pos = (lemma.pos or "").strip()
    language_code = (lemma.language or "en").lower()
    updated = False
    
    # Normalize lemma to its canonical form (e.g., infinitive for verbs)
    normalized = dictionary_service.normalize_word_form(lemma.lemma, language_code)
    if normalized and normalized != lemma.lemma:
        lemma.lemma = normalized
        lemma.definition = None
        definition = ""
        updated = True

    needs_definition = (not definition) or (definition.lower() == lemma.lemma.lower())
    needs_morphology = not _has_substantive_grammar(morphology)
    needs_pos = not pos

    if not (needs_definition or needs_morphology or needs_pos):
        return definition or "", morphology, pos or "", False

    try:
        dict_info = dictionary_service.get_word_info(
            lemma.lemma,
            language_code,
            "en"
        )
    except Exception as exc:
        print(f"[Vocab] Dictionary lookup failed for '{lemma.lemma}': {exc}")
        return definition or "", morphology, pos or "", False

    normalized_from_dict = (dict_info.get('normalized_word') or "").strip()
    if normalized_from_dict and normalized_from_dict != lemma.lemma:
        lemma.lemma = normalized_from_dict
        lemma.definition = None
        definition = ""
        needs_definition = True
        updated = True
    
    if needs_definition:
        translation = (dict_info.get('translation') or dict_info.get('definition') or "").strip()
        if translation and translation.lower() != lemma.lemma.lower():
            definition = translation
            lemma.definition = translation
            updated = True

    if needs_morphology:
        grammar = dict_info.get('grammar') or {}
        if isinstance(grammar, dict) and grammar:
            for key, value in grammar.items():
                if key not in MORPHOLOGY_EXCLUDE_KEYS and (key not in morphology or not morphology[key]):
                    morphology[key] = value
            lemma.morphology = morphology
            updated = True

    if needs_pos and dict_info.get('part_of_speech'):
        pos_value = str(dict_info['part_of_speech']).upper()
        pos = pos_value
        lemma.pos = pos_value[:20]
        updated = True

    return definition or "", morphology, pos or "", updated


def _normalize_status_value(status: Optional[str]) -> str:
    if not status:
        return "unknown"
    status_lower = status.lower()
    if status_lower in STATUS_LEARNED_VALUES:
        return "learned"
    if status_lower in STATUS_UNKNOWN_VALUES:
        return "unknown"
    if status_lower == "ignored":
        return "ignored"
    return "unknown"


def _build_status_filter_clause(status_column, desired_status: Optional[str]):
    if not desired_status:
        return None
    if desired_status == "learned":
        return status_column.in_(list(STATUS_LEARNED_VALUES))
    if desired_status == "ignored":
        return status_column == "ignored"
    if desired_status == "unknown":
        return or_(
            status_column.is_(None),
            status_column.in_(list(STATUS_UNKNOWN_VALUES))
        )
    return None


def _build_frequency_map(
    db: Session,
    book_id: int,
    lemma_ids: List[int]
) -> Dict[int, int]:
    if not lemma_ids:
        return {}
    freq_results = db.query(
        Token.lemma_id,
        func.count(Token.id).label("frequency")
    ).filter(
        Token.book_id == book_id,
        Token.lemma_id.in_(lemma_ids)
    ).group_by(Token.lemma_id).all()
    return {lemma_id: frequency for lemma_id, frequency in freq_results}


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
    status: str  # learned, unknown, ignored
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


class VocabStatusUpdateRequest(BaseModel):
    lemma_id: int
    status: str


class BulkStatusUpdateRequest(BaseModel):
    updates: List[VocabStatusUpdateRequest]


def _build_vocabulary_items(
    lemmas_with_status,
    frequency_map: Dict[int, int],
    enrich_lemmas: bool,
    db: Session
):
    vocabulary: List[VocabularyItem] = []
    lemmas_updated = False
    for lemma, user_status_value in lemmas_with_status:
        if enrich_lemmas:
            definition, morphology, pos, updated = _enrich_lemma_if_needed(lemma)
            if updated:
                lemmas_updated = True
        else:
            definition = (lemma.definition or "").strip()
            morphology = _format_morphology(lemma.morphology)
            pos = (lemma.pos or "").strip()
        normalized_status = _normalize_status_value(user_status_value)
        frequency_in_book = frequency_map.get(lemma.id, 0)
        
        vocabulary_item = VocabularyItem(
            lemma=LemmaResponse(
                id=lemma.id,
                lemma=lemma.lemma,
                language=lemma.language,
                pos=pos or lemma.pos or "",
                definition=definition,
                morphology=morphology,
                global_frequency=lemma.global_frequency or 0.0
            ),
            frequency_in_book=frequency_in_book,
            difficulty_estimate=0.0,
            status=normalized_status,
            example_sentences=[],
            collocations=[]
        )
        vocabulary.append(vocabulary_item)
    return vocabulary, lemmas_updated

@router.get("/book/{book_id}", response_model=VocabularyResponse)
async def get_book_vocabulary(
    book_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    sort_by: str = Query("frequency", regex="^(frequency|alphabetical|chronological|random)$"),
    filter_status: Optional[str] = Query(None, regex="^(learned|known|learning|unknown|ignored)$"),
    chapter: Optional[int] = Query(None, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    # Check if book exists and is processing - allow partial results
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Start with base query - filter by book_id through tokens
    # This will return empty if processing hasn't created tokens yet, which is fine
    # Vocabulary appears incrementally as batches are committed
    
    user_id = current_user["user_id"]

    lemma_ids_subquery = db.query(Token.lemma_id).filter(Token.book_id == book_id)
    if chapter is not None:
        lemma_ids_subquery = lemma_ids_subquery.filter(Token.chapter == chapter)
    lemma_ids_subquery = lemma_ids_subquery.distinct().subquery()
    
    status_subquery = db.query(
        UserVocabStatus.lemma_id.label("lemma_id"),
        UserVocabStatus.status.label("status")
    ).filter(UserVocabStatus.user_id == user_id).subquery()
    
    query = db.query(Lemma, status_subquery.c.status.label("user_status")).join(
        lemma_ids_subquery, Lemma.id == lemma_ids_subquery.c.lemma_id
    ).outerjoin(
        status_subquery, Lemma.id == status_subquery.c.lemma_id
    )
    
    if sort_by == "frequency":
        query = query.order_by(desc(Lemma.global_frequency))
    elif sort_by == "alphabetical":
        query = query.order_by(Lemma.lemma)
    elif sort_by == "random":
        query = query.order_by(func.random())
    else:  # chronological (by lemma ID, which reflects insertion order)
        query = query.order_by(desc(Lemma.id))
    
    normalized_filter_status = _normalize_status_value(filter_status) if filter_status else None
    filter_clause = _build_status_filter_clause(status_subquery.c.status, normalized_filter_status)
    if filter_clause is not None:
        query = query.filter(filter_clause)
    
    count_query = db.query(func.count(distinct(Lemma.id))).join(
        Token, Token.lemma_id == Lemma.id
    ).filter(Token.book_id == book_id)
    if chapter is not None:
        count_query = count_query.filter(Token.chapter == chapter)
    count_query = count_query.outerjoin(
        status_subquery, Lemma.id == status_subquery.c.lemma_id
    )
    if filter_clause is not None:
        count_query = count_query.filter(filter_clause)
    total_count = count_query.scalar() or 0
    
    query = query.limit(limit).offset((page - 1) * limit)
    
    lemmas_with_status = query.all()
    
    lemma_ids = [lemma.id for lemma, _ in lemmas_with_status]
    frequency_map = _build_frequency_map(db, book_id, lemma_ids)
    vocabulary, lemmas_updated = _build_vocabulary_items(
        lemmas_with_status,
        frequency_map,
        True,
        db
    )
    
    if lemmas_updated:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[Vocab] Failed to persist dictionary enrichment: {exc}")

    return VocabularyResponse(
        book_id=book_id,
        vocabulary=vocabulary,
        total_count=total_count,
        page=page,
        limit=limit,
        sort_by=sort_by,
        filter_status=normalized_filter_status
    )


@router.get("/book/{book_id}/swipe-session", response_model=VocabularyResponse)
async def get_swipe_session_vocabulary(
    book_id: int,
    limit: int = Query(200, ge=20, le=400),
    filter_status: Optional[str] = Query("unknown", regex="^(learned|known|learning|unknown|ignored)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    user_id = current_user["user_id"]
    normalized_filter_status = _normalize_status_value(filter_status) if filter_status else None
    overfetch_factor = 3
    
    lemma_ids_subquery = db.query(Token.lemma_id).filter(Token.book_id == book_id).distinct().subquery()
    
    status_subquery = db.query(
        UserVocabStatus.lemma_id.label("lemma_id"),
        UserVocabStatus.status.label("status")
    ).filter(UserVocabStatus.user_id == user_id).subquery()
    
    query = db.query(Lemma, status_subquery.c.status.label("user_status")).join(
        lemma_ids_subquery, Lemma.id == lemma_ids_subquery.c.lemma_id
    ).outerjoin(
        status_subquery, Lemma.id == status_subquery.c.lemma_id
    )
    
    filter_clause = _build_status_filter_clause(status_subquery.c.status, normalized_filter_status)
    if filter_clause is not None:
        query = query.filter(filter_clause)
    
    lemmas_with_status = query.order_by(func.random()).limit(limit * overfetch_factor).all()
    lemma_ids = [lemma.id for lemma, _ in lemmas_with_status]
    frequency_map = _build_frequency_map(db, book_id, lemma_ids)
    
    vocabulary, _ = _build_vocabulary_items(
        lemmas_with_status,
        frequency_map,
        False,
        db
    )
    
    trimmed_vocabulary = vocabulary[:limit]
    
    return VocabularyResponse(
        book_id=book_id,
        vocabulary=trimmed_vocabulary,
        total_count=len(trimmed_vocabulary),
        page=1,
        limit=limit,
        sort_by="swipe_session",
        filter_status=normalized_filter_status
    )

@router.get("/lemma/{lemma_id}")
async def get_lemma_details(
    lemma_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    user_status = db.query(UserVocabStatus).filter(
        UserVocabStatus.lemma_id == lemma_id,
        UserVocabStatus.user_id == current_user["user_id"]
    ).first()
    normalized_status = _normalize_status_value(user_status.status if user_status else None)
    
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
        "status": normalized_status,
        "example_sentences": [],
        "collocations": []
    }

@router.post("/status/bulk")
async def bulk_update_vocab_status(
    payload: BulkStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    updates = payload.updates or []
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    if len(updates) > 500:
        raise HTTPException(status_code=400, detail="Too many updates requested (max 500)")
    
    normalized_updates: Dict[int, str] = {}
    for update in updates:
        status_lower = (update.status or "").lower()
        if status_lower and status_lower not in ALLOWED_STATUS_INPUTS:
            raise HTTPException(status_code=400, detail=f"Invalid status value: {update.status}")
        normalized_updates[update.lemma_id] = _normalize_status_value(update.status)
    
    lemma_ids = list(normalized_updates.keys())
    if not lemma_ids:
        raise HTTPException(status_code=400, detail="No valid updates provided")
    
    existing_lemmas = {
        row[0] for row in db.query(Lemma.id).filter(Lemma.id.in_(lemma_ids)).all()
    }
    normalized_updates = {
        lemma_id: status for lemma_id, status in normalized_updates.items()
        if lemma_id in existing_lemmas
    }
    if not normalized_updates:
        raise HTTPException(status_code=404, detail="No matching lemmas found for updates")
    
    user_id = current_user.get("user_id", 1)
    existing_statuses = db.query(UserVocabStatus).filter(
        UserVocabStatus.user_id == user_id,
        UserVocabStatus.lemma_id.in_(list(normalized_updates.keys()))
    ).all()
    existing_map = {status.lemma_id: status for status in existing_statuses}
    
    updated_count = 0
    for lemma_id, normalized_status in normalized_updates.items():
        user_status = existing_map.get(lemma_id)
        if user_status:
            if user_status.status != normalized_status:
                user_status.status = normalized_status
                updated_count += 1
        else:
            new_status = UserVocabStatus(
                lemma_id=lemma_id,
                user_id=user_id,
                status=normalized_status
            )
            db.add(new_status)
            updated_count += 1
    
    db.commit()
    
    return {
        "updated": updated_count,
        "requested": len(normalized_updates),
        "user_id": user_id
    }


@router.put("/status/{lemma_id}")
async def update_vocab_status(
    lemma_id: int, 
    status_data: dict,
    db: Session = Depends(get_db),
      current_user: dict = Depends(get_current_user_real)
):
    # Check if lemma exists
    lemma = db.query(Lemma).filter(Lemma.id == lemma_id).first()
    if not lemma:
        raise HTTPException(status_code=404, detail="Lemma not found")
    
    status_input = status_data.get("status", "unknown")
    status_lower = (status_input or "").lower()
    if status_lower and status_lower not in ALLOWED_STATUS_INPUTS:
        raise HTTPException(status_code=400, detail="Invalid status value")
    status = status_input or "unknown"
    normalized_status = _normalize_status_value(status)
    user_id = current_user.get("user_id", 1)
    
    # Update or create user vocabulary status
    user_status = db.query(UserVocabStatus).filter(
        UserVocabStatus.lemma_id == lemma_id,
        UserVocabStatus.user_id == user_id
    ).first()
    
    if user_status:
        user_status.status = normalized_status
    else:
        user_status = UserVocabStatus(
            lemma_id=lemma_id,
            user_id=user_id,
            status=normalized_status
        )
        db.add(user_status)
    
    db.commit()
    
    return {
        "lemma_id": lemma_id,
        "user_id": user_id,
        "status": normalized_status,
        "updated": True
    }

@router.get("/book/{book_id}/count")
async def get_book_vocabulary_count(book_id: int, db: Session = Depends(get_db)):
    """Get the total count of vocabulary items for a book."""
    # Use distinct on ID to avoid PostgreSQL JSON column issues
    count = db.query(func.count(distinct(Lemma.id))).join(Token).filter(Token.book_id == book_id).scalar()
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
        normalized_status = _normalize_status_value(user_status.status if user_status else None)
        
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
            status=normalized_status,
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
