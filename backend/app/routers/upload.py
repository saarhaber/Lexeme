from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
import shutil
import os
import sys
from pathlib import Path
from datetime import datetime
import threading
sys.path.append('..')
from database import get_db, SessionLocal
from ..models.book import Book, RawText
from ..services.book_processor import BookMetadataExtractor
from ..services.comprehensive_vocabulary_processor import ComprehensiveVocabularyProcessor
from ..services.dictionary_service import DictionaryService
from ..utils.text_utils import sanitize_text

router = APIRouter()

class UploadResponse(BaseModel):
    book_id: int
    status: str
    message: str
    processing_steps: list

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize metadata extractor and comprehensive vocabulary processor
metadata_extractor = BookMetadataExtractor()
vocabulary_processor = ComprehensiveVocabularyProcessor()
dictionary_service = DictionaryService()

# Try to initialize spaCy processor (optional enhancement)
try:
    from ..services.spacy_processor import SpacyProcessor
    spacy_available = True
except ImportError:
    spacy_available = False
    print("⚠️  spaCy not available, using fallback NLP processors")

def process_book_background(book_id: int, file_path: str, text_content: str, language: str, word_count: int):
    """Background processing function for book vocabulary extraction."""
    db = SessionLocal()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            print(f"Book {book_id} not found for background processing")
            return
        
        print(f"[Background] Starting vocabulary processing for book {book_id}...")
        
        # Process vocabulary using comprehensive processor - extracts ALL words
        print("[Background] Processing ALL vocabulary with comprehensive NLP...")
        
        # Process vocabulary - use comprehensive processor which properly extracts all words
        print("[Background] Processing vocabulary with comprehensive processor...")
        comprehensive_analysis = vocabulary_processor.extract_all_vocabulary(text_content, language)
        
        print(f"[Background] Comprehensive analysis - Total words: {comprehensive_analysis['total_words']}")
        print(f"[Background] Comprehensive analysis - Unique words: {comprehensive_analysis['unique_words']}")
        
        # Update book with word counts (set final unique lemma count from analysis)
        # This ensures stats are correct even if incremental updates fail
        book.total_words = comprehensive_analysis['total_words']
        book.unique_lemmas = comprehensive_analysis['unique_words']
        db.commit()
        print(f"[Background] Updated word counts: {book.total_words} total, {book.unique_lemmas} unique")
        
        # Save comprehensive vocabulary analysis to database with proper lemmatization
        print("[Background] Saving comprehensive vocabulary analysis to database...")
        print(f"[Background] Processing {len(comprehensive_analysis.get('vocabulary', {}))} unique words...")
        vocabulary_processor.save_comprehensive_analysis_with_lemmatization(
            comprehensive_analysis, book.id, language, db, dictionary_service
        )
        print("[Background] Comprehensive vocabulary analysis saved to database")
        
        # Update book status to completed
        book.processing_status = "completed"
        db.commit()
        print(f"[Background] ✅ Book {book_id} processing completed!")
        
    except Exception as e:
        print(f"[Background] Error processing book {book_id}: {e}")
        import traceback
        traceback.print_exc()
        # Update book status to failed
        try:
            book = db.query(Book).filter(Book.id == book_id).first()
            if book:
                book.processing_status = "failed"
                db.commit()
        except:
            pass
    finally:
        db.close()

@router.post("/book")
async def upload_book(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(lambda: {"user_id": 1})  # TODO: Proper auth injection
):
    try:
        # Validate file type
        allowed_extensions = {".pdf", ".epub", ".txt", ".docx"}
        file_extension = Path(file.filename).suffix.lower()

        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_extension} not supported. Allowed: {', '.join(allowed_extensions)}"
            )

        # Generate unique filename to avoid conflicts
        import uuid
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename

        # Save uploaded file
        print(f"Saving file to: {file_path}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract metadata from the book (quick operation)
        print("Extracting metadata...")
        title, author = metadata_extractor.extract_metadata(str(file_path))
        print(f"Extracted metadata - Title: {title}, Author: {author}")

        # Use fallback title if extraction failed
        if not title:
            title = metadata_extractor.get_fallback_title(file.filename)
            print(f"Using fallback title: {title}")

        # Extract text for language detection (quick operation)
        print("Extracting text for language detection...")
        text_content, word_count = metadata_extractor.extract_text(str(file_path))
        print(f"Extracted text - Length: {len(text_content)} characters, Word count: {word_count}")
        
        if not text_content.strip():
            print("WARNING: No text content extracted from file!")
        
        # Sanitize text to remove invalid Unicode surrogates before processing
        print("Sanitizing text content...")
        text_content = sanitize_text(text_content)
        print(f"Sanitized text - Length: {len(text_content)} characters")
            
        # Detect language using professional NLP (quick operation)
        print("Detecting language using professional NLP...")
        language = metadata_extractor.detect_language(text_content)
        print(f"Detected language: {language}")
        
        # Create book record in database immediately
        user_id = current_user.get("user_id", 1)
        
        book = Book(
            title=title,
            author=author,
            language=language,
            upload_date=datetime.utcnow(),
            user_id=user_id,
            file_path=str(file_path),
            processing_status="processing",
            total_words=word_count,
            unique_lemmas=0  # Will be updated in background
        )

        db.add(book)
        db.commit()
        db.refresh(book)
        print(f"Created book record with ID: {book.id}")
        
        # Save raw text to database (quick operation)
        print("Saving raw text to database...")
        raw_text_record = RawText(
            book_id=book.id,
            content=text_content,
            word_count=word_count
        )
        db.add(raw_text_record)
        db.commit()
        print("Raw text saved to database")
        
        # Start background processing thread
        print("Starting background vocabulary processing...")
        processing_thread = threading.Thread(
            target=process_book_background,
            args=(book.id, str(file_path), text_content, language, word_count),
            daemon=True
        )
        processing_thread.start()

        return UploadResponse(
            book_id=book.id,
            status="processing",
            message=f"Book '{title}' uploaded successfully! Vocabulary processing in progress. You can start studying now!",
            processing_steps=[
                "File uploaded",
                "Metadata extracted",
                f"Language detected as {language}",
                f"Text extracted ({word_count} words)",
                "Vocabulary processing started in background...",
                "You can start studying while processing completes!"
            ]
        )
        
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/status/{book_id}")
async def get_upload_status(book_id: int, db: Session = Depends(get_db)):
    """Get the current processing status of a book."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Calculate progress based on status
    if book.processing_status == "completed":
        progress = 100
    elif book.processing_status == "failed":
        progress = 0
    elif book.processing_status == "processing":
        # Estimate progress based on vocabulary processing stage
        if book.unique_lemmas > 0:
            # Vocabulary extraction done, now saving to DB
            # Progress is based on unique_lemmas processed vs estimated total
            if book.total_words > 0:
                # Estimate unique lemmas: typically 5-10% of total words for most books
                # Use a conservative estimate of 7% unique lemmas
                estimated_unique_lemmas = max(int(book.total_words * 0.07), book.unique_lemmas)
                
                # Progress: 30% (extraction) + 70% (saving based on lemmas processed)
                extraction_progress = 30
                saving_progress = min(70 * (book.unique_lemmas / max(estimated_unique_lemmas, 1)), 70)
                progress = int(extraction_progress + saving_progress)
                
                # Cap at 99% until actually completed
                progress = min(progress, 99)
            else:
                progress = 50
        else:
            # Still extracting vocabulary
            progress = 30
    else:
        progress = 0
    
    return {
        "book_id": book_id,
        "status": book.processing_status,  # pending, processing, completed, failed
        "progress": progress,
        "current_step": "Processing vocabulary..." if book.processing_status == "processing" else "Complete" if book.processing_status == "completed" else "Failed",
        "total_words": book.total_words,
        "unique_lemmas": book.unique_lemmas
    }

@router.get("/books/{user_id}")
async def get_user_books(user_id: int, db: Session = Depends(get_db)):
    """Get all books uploaded by a user."""
    books = db.query(Book).filter(Book.user_id == user_id).all()
    return [
        {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "language": book.language,
            "upload_date": book.upload_date,
            "processing_status": book.processing_status,
            "total_words": book.total_words,
            "unique_lemmas": book.unique_lemmas
        }
        for book in books
    ]
