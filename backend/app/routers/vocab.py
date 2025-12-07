import os
import random
import re
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, status, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Tuple, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, distinct, or_
import sys
sys.path.append('..')
from database import get_db, SessionLocal
from ..models.lemma import Lemma, Token
from ..models.book import Book
from ..models.user import User, UserVocabStatus
from ..services.dictionary_service import DictionaryService
from ..utils.security import decode_access_token, oauth2_scheme
from wordfreq import zipf_frequency

router = APIRouter()
dictionary_service = DictionaryService()


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return max(0, int(value))
    except ValueError:
        print(f"[Vocab] Invalid value '{value}' for {name}, using default {default}")
        return default


MAX_SYNC_ENRICHMENTS = _int_env("MAX_VOCAB_ENRICH_PER_REQUEST", 25)
MAX_BACKGROUND_ENRICHMENTS = _int_env("MAX_VOCAB_ENRICH_BACKGROUND", 200)


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

def _format_frequency(global_frequency: float) -> Optional[str]:
    """Format global frequency as frequency level string."""
    if global_frequency > 0.01:
        return 'Very common'
    elif global_frequency > 0.005:
        return 'Common'
    elif global_frequency > 0.001:
        return 'Moderate'
    elif global_frequency > 0.0001:
        return 'Less common'
    elif global_frequency > 0:
        return 'Rare'
    return None


def _lemma_needs_enrichment(lemma: Lemma) -> bool:
    definition = (lemma.definition or "").strip()
    morphology = _format_morphology(lemma.morphology)
    pos = (lemma.pos or "").strip()
    if (not definition) or (definition.lower() == lemma.lemma.lower()):
        return True
    if not _has_substantive_grammar(morphology):
        return True
    if not pos:
        return True
    return False


_INVALID_DEFINITION_PREFIXES = (
    "plural:",
    "feminine:",
    "masculine:",
    "root:",
    "prefix:",
    "suffix:",
)


def _has_valid_definition(definition: Optional[str], lemma_text: str) -> bool:
    """Return True if the definition looks like a real translation/definition."""
    if not definition:
        return False
    cleaned = (definition or "").strip()
    if not cleaned:
        return False
    lower_clean = cleaned.lower()
    if lower_clean == (lemma_text or "").lower():
        return False
    if any(lower_clean.startswith(prefix) for prefix in _INVALID_DEFINITION_PREFIXES):
        return False
    # Reject entries without alphabetic content
    if not re.search(r"[A-Za-z]", cleaned):
        return False
    # Reject extremely short alpha content (e.g., "-")
    alpha_only = re.sub(r'[^A-Za-z]', '', cleaned)
    if len(alpha_only) < 2:
        return False

    words = cleaned.split()
    # Very long phrases for tiny lemmas are usually noise
    if len(words) > 4 and len(lemma_text or "") <= 4:
        return False
    # Proper-noun translation for lowercase lemmas is suspicious (e.g., "Berlin" for "umani")
    if (lemma_text and lemma_text[0].islower() and cleaned and cleaned[0].isupper() and len(words) == 1 and len(lemma_text) >= 3):
        return False
    # Use word frequency to catch unlikely typos in short lemmas
    try:
        freq = zipf_frequency(words[0].lower(), "en", wordlist="best")
        if freq < 1.0 and len(lemma_text or "") <= 4 and len(words) == 1:
            return False
    except Exception:
        pass
    return True


def _enrich_lemma_if_needed(lemma: Lemma, db: Optional[Session] = None) -> Tuple[str, dict, str, bool]:
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
        # Pass db session so DictionaryService can check database first
        # This reuses definitions from previously processed books - no API call needed!
        dict_info = dictionary_service.get_word_info(
            lemma.lemma,
            language_code,
            "en",
            db=db  # Pass database session for database-first lookup
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
        if translation and translation.lower() != lemma.lemma.lower() and _has_valid_definition(translation, lemma.lemma):
            definition = translation
            lemma.definition = translation
            updated = True
        else:
            # Drop unusable definitions (e.g., plural markers)
            definition = ""
            lemma.definition = None

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


def _background_enrich_lemmas(lemma_ids: List[int]):
    if not lemma_ids:
        return
    db = SessionLocal()
    try:
        lemmas = db.query(Lemma).filter(Lemma.id.in_(lemma_ids)).all()
        updated = False
        for lemma in lemmas:
            _, _, _, changed = _enrich_lemma_if_needed(lemma, db)
            if changed:
                updated = True
        if updated:
            db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[Vocab] Background enrichment failed: {exc}")
    finally:
        db.close()


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


@router.get("/book/{book_id}/stats")
async def get_book_vocabulary_stats(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real),
):
    """
    Lightweight vocabulary stats endpoint.
    Returns only counts (learned/unknown/ignored) for the current user to
    avoid transferring full vocabulary payloads when the UI only needs
    summary information.
    """
    user_id = current_user["user_id"]

    lemma_ids = [
        row[0]
        for row in db.query(Token.lemma_id)
        .filter(Token.book_id == book_id)
        .distinct()
        .all()
    ]
    total = len(lemma_ids)
    if total == 0:
        return {
            "book_id": book_id,
            "total": 0,
            "learned": 0,
            "unknown": 0,
            "ignored": 0,
        }

    statuses = db.query(
        UserVocabStatus.lemma_id,
        UserVocabStatus.status,
    ).filter(
        UserVocabStatus.user_id == user_id,
        UserVocabStatus.lemma_id.in_(lemma_ids),
    ).all()
    status_map = {
        lemma_id: _normalize_status_value(status) for lemma_id, status in statuses
    }

    learned = sum(1 for status in status_map.values() if status == "learned")
    ignored = sum(1 for status in status_map.values() if status == "ignored")
    unknown = max(total - learned - ignored, 0)

    return {
        "book_id": book_id,
        "total": total,
        "learned": learned,
        "unknown": unknown,
        "ignored": ignored,
    }


class LemmaResponse(BaseModel):
    id: int
    lemma: str
    language: str
    pos: str
    definition: str
    morphology: dict
    global_frequency: float

class WordEntry(BaseModel):
    """Word entry matching frontend DemoWordEntry structure."""
    word: str
    translation: str
    definition: str
    pos: str
    context: Optional[str] = None
    cefr: Optional[str] = None
    frequency: Optional[str] = None
    notes: Optional[str] = None
    forms: Optional[List[str]] = None
    synonyms: Optional[List[str]] = None
    tip: Optional[str] = None

class VocabularyItem(BaseModel):
    lemma: LemmaResponse
    word_entry: Optional[WordEntry] = None  # Rich word data matching frontend structure
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
    db: Session,
    max_sync_enrichments: int = 0,
    max_background_queue: int = 0,
    include_word_entry: bool = True
):
    vocabulary: List[VocabularyItem] = []
    lemmas_updated = False
    background_queue: List[int] = []
    sync_enriched = 0
    for lemma, user_status_value in lemmas_with_status:
        definition = (lemma.definition or "").strip()
        morphology = _format_morphology(lemma.morphology)
        pos = (lemma.pos or "").strip()
        updated = False

        if enrich_lemmas and _lemma_needs_enrichment(lemma):
            if sync_enriched < max_sync_enrichments:
                definition, morphology, pos, updated = _enrich_lemma_if_needed(lemma, db)
                sync_enriched += 1
            elif len(background_queue) < max_background_queue:
                background_queue.append(lemma.id)
        elif not enrich_lemmas:
            # Keep cached values
            definition = definition or ""
            pos = pos or ""

        normalized_status = _normalize_status_value(user_status_value)
        frequency_in_book = frequency_map.get(lemma.id, 0)
        global_freq = int(lemma.global_frequency or 0)
        if frequency_in_book >= 20 and global_freq > frequency_in_book:
            # Tokens were previously capped; fall back to the full count we stored
            frequency_in_book = global_freq
        
        # Get rich word entry data matching frontend DemoWordEntry structure
        example_context = None
        word_entry = None
        if include_word_entry:
            try:
                # Get example sentence for context
                if lemma.id in frequency_map:
                    # Try to get a token with sentence context
                    token_with_context = db.query(Token).filter(
                        Token.lemma_id == lemma.id
                    ).filter(
                        Token.sentence_context.isnot(None)
                    ).first()
                    if token_with_context and token_with_context.sentence_context:
                        example_context = token_with_context.sentence_context
                
                # Get word entry in DemoWordEntry format
                word_entry_data = dictionary_service.get_word_entry(
                    lemma.lemma,
                    lemma.language,
                    "en",
                    context=example_context,
                    db=db
                )
                word_entry = WordEntry(**word_entry_data)
            except Exception as e:
                print(f"[Vocab] Error creating word entry for {lemma.lemma}: {e}")
                # Create minimal word entry if lookup fails
                word_entry = WordEntry(
                    word=lemma.lemma,
                    translation=definition or "",
                    definition=definition or "",
                    pos=pos or lemma.pos or "",
                    context=example_context,
                    frequency=_format_frequency(lemma.global_frequency) if lemma.global_frequency else None
                )
        
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
            word_entry=word_entry,
            frequency_in_book=frequency_in_book,
            difficulty_estimate=0.0,
            status=normalized_status,
            example_sentences=[],
            collocations=[]
        )
        vocabulary.append(vocabulary_item)
        if updated:
            lemmas_updated = True
    return vocabulary, lemmas_updated, background_queue

@router.get("/book/{book_id}", response_model=VocabularyResponse)
async def get_book_vocabulary(
    book_id: int,
    background_tasks: BackgroundTasks,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=1000),
    sort_by: str = Query("frequency", regex="^(frequency|alphabetical|chronological|random)$"),
    filter_status: Optional[str] = Query(None, regex="^(learned|known|learning|unknown|ignored)$"),
    chapter: Optional[int] = Query(None, ge=0),
    include_word_entry: bool = Query(True, description="Include rich word_entry data; set false for faster responses"),
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
    vocabulary, lemmas_updated, pending_background = _build_vocabulary_items(
        lemmas_with_status,
        frequency_map,
        True,
        db,
        max_sync_enrichments=MAX_SYNC_ENRICHMENTS,
        max_background_queue=MAX_BACKGROUND_ENRICHMENTS,
        include_word_entry=include_word_entry
    )
    
    if pending_background:
        deduped = list(dict.fromkeys(pending_background))
        if deduped:
            background_tasks.add_task(_background_enrich_lemmas, deduped)
    
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
    offset: int = Query(0, ge=0),
    filter_status: Optional[str] = Query("unknown", regex="^(learned|known|learning|unknown|ignored)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_real)
):
    """
    Ultra-fast swipe session endpoint - optimized for maximum performance.
    Returns minimal data with no enrichment for instant loading.
    """
    user_id = current_user["user_id"]
    normalized_filter_status = _normalize_status_value(filter_status) if filter_status else None
    
    # Ultra-fast path: Get lemma IDs directly from tokens (no joins needed)
    # This is the fastest possible query
    token_lemma_ids = db.query(Token.lemma_id).join(Lemma, Lemma.id == Token.lemma_id).filter(
        Token.book_id == book_id,
        Lemma.definition.isnot(None),
        func.length(func.trim(Lemma.definition)) > 0,
        func.lower(func.trim(Lemma.definition)) != func.lower(func.trim(Lemma.lemma))
    ).distinct().all()
    
    if not token_lemma_ids:
        return VocabularyResponse(
            book_id=book_id,
            vocabulary=[],
            total_count=0,
            page=1,
            limit=0,
            sort_by="swipe_session",
            filter_status=normalized_filter_status
        )
    
    all_lemma_ids = [row[0] for row in token_lemma_ids]
    
    # Get user statuses in one query (much faster than subquery)
    user_statuses = db.query(
        UserVocabStatus.lemma_id,
        UserVocabStatus.status
    ).filter(
        UserVocabStatus.user_id == user_id,
        UserVocabStatus.lemma_id.in_(all_lemma_ids)
    ).all()
    
    status_map = {lemma_id: status for lemma_id, status in user_statuses}
    
    # Filter by status if needed
    if normalized_filter_status:
        if normalized_filter_status == "learned":
            filtered_ids = [lid for lid, status in status_map.items() 
                          if status and status.lower() in STATUS_LEARNED_VALUES]
        elif normalized_filter_status == "unknown":
            filtered_ids = [lid for lid in all_lemma_ids 
                          if lid not in status_map or 
                          (status_map.get(lid) and status_map[lid].lower() in STATUS_UNKNOWN_VALUES) or
                          status_map.get(lid) is None]
        else:
            filtered_ids = [lid for lid, status in status_map.items() if status == normalized_filter_status]
    else:
        filtered_ids = all_lemma_ids
    
    # For initial load, use smaller batch
    initial_batch_size = 30 if offset == 0 else limit
    actual_limit = min(initial_batch_size, limit)
    
    # Ultra-fast random sampling: Use Python random on IDs (faster than SQL random)
    import random
    if len(filtered_ids) > actual_limit:
        # Sample random IDs without replacement
        sampled_ids = random.sample(filtered_ids, min(actual_limit, len(filtered_ids)))
    else:
        sampled_ids = filtered_ids[:actual_limit]
    
    # Fetch lemmas directly by ID (indexed lookup - very fast)
    lemmas = db.query(Lemma).filter(Lemma.id.in_(sampled_ids)).all()

    # Try to enrich lemmas that slipped through without a usable translation
    lemmas_needing_enrichment = [
        lemma for lemma in lemmas if not _has_valid_definition(lemma.definition, lemma.lemma)
    ]
    updated_any = False
    for lemma in lemmas_needing_enrichment[:MAX_SYNC_ENRICHMENTS]:
        definition, morphology, pos, changed = _enrich_lemma_if_needed(lemma, db)
        if definition:
            lemma.definition = definition
        if morphology:
            merged = _format_morphology(lemma.morphology)
            merged.update(morphology)
            lemma.morphology = merged
        if pos:
            lemma.pos = pos
        updated_any = updated_any or changed
    if updated_any:
        try:
            db.commit()
        except Exception as exc:
            db.rollback()
            print(f"[Vocab] Failed to persist swipe enrichment: {exc}")
    
    # Build frequency map in one query
    frequency_results = db.query(
        Token.lemma_id,
        func.count(Token.id).label("frequency")
    ).filter(
        Token.book_id == book_id,
        Token.lemma_id.in_(sampled_ids)
    ).group_by(Token.lemma_id).all()
    frequency_map = {lemma_id: frequency for lemma_id, frequency in frequency_results}
    
    # Build vocabulary items WITHOUT enrichment (ultra-fast)
    vocabulary: List[VocabularyItem] = []
    for lemma in lemmas:
        # Skip lemmas that still don't have a usable translation/definition
        if not _has_valid_definition(lemma.definition, lemma.lemma):
            continue

        user_status = status_map.get(lemma.id)
        normalized_status = _normalize_status_value(user_status)
        frequency_in_book = frequency_map.get(lemma.id, 0)
        global_freq = int(lemma.global_frequency or 0)
        if frequency_in_book >= 20 and global_freq > frequency_in_book:
            # Tokens were previously capped; fall back to the full count we stored
            frequency_in_book = global_freq
        
        # Create minimal word_entry from cached data (no API calls)
        word_entry = None
        if lemma.definition:
            word_entry = WordEntry(
                word=lemma.lemma,
                translation=lemma.definition,
                definition=lemma.definition,
                pos=lemma.pos or "",
                frequency=_format_frequency(lemma.global_frequency) if lemma.global_frequency else None
            )
        
        vocabulary_item = VocabularyItem(
            lemma=LemmaResponse(
                id=lemma.id,
                lemma=lemma.lemma,
                language=lemma.language,
                pos=lemma.pos or "",
                definition=lemma.definition or "",
                morphology=_format_morphology(lemma.morphology),
                global_frequency=lemma.global_frequency or 0.0
            ),
            word_entry=word_entry,
            frequency_in_book=frequency_in_book,
            difficulty_estimate=0.0,
            status=normalized_status,
            example_sentences=[],
            collocations=[]
        )
        vocabulary.append(vocabulary_item)
    
    # Only get total count for first page
    total_count = len(filtered_ids) if offset == 0 else 0
    
    return VocabularyResponse(
        book_id=book_id,
        vocabulary=vocabulary,
        total_count=total_count,
        page=(offset // limit) + 1 if limit > 0 else 1,
        limit=actual_limit,
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
