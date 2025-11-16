#!/usr/bin/env python3
"""
Script to fix books that were processed but don't have tokens.
This creates tokens retroactively for existing books.
"""
import sys
sys.path.append('.')

from database import SessionLocal
from app.models.book import Book, RawText
from app.models.lemma import Lemma, Token
from app.services.comprehensive_vocabulary_processor import ComprehensiveVocabularyProcessor
from app.services.dictionary_service import DictionaryService

def fix_book_tokens(book_id: int):
    """Fix tokens for a specific book."""
    db = SessionLocal()
    try:
        book = db.query(Book).filter(Book.id == book_id).first()
        if not book:
            print(f"Book {book_id} not found")
            return False
        
        # Check if tokens already exist
        existing_tokens = db.query(Token).filter(Token.book_id == book_id).count()
        if existing_tokens > 0:
            print(f"Book {book_id} already has {existing_tokens} tokens. Skipping.")
            return True
        
        print(f"\n{'='*60}")
        print(f"Fixing tokens for Book {book_id}: {book.title}")
        print(f"{'='*60}")
        print(f"Language: {book.language}")
        print(f"Status: {book.processing_status}")
        print(f"Total words: {book.total_words}")
        print(f"Unique lemmas: {book.unique_lemmas}")
        
        # Get raw text - try database first, then file
        raw_text_record = db.query(RawText).filter(RawText.book_id == book_id).first()
        text_content = None
        
        if raw_text_record and raw_text_record.content:
            text_content = raw_text_record.content
            print("Using raw text from database")
        elif book.file_path:
            # Extract text from file
            import os
            file_path = book.file_path
            # Convert to absolute path if relative
            if not os.path.isabs(file_path):
                file_path = os.path.abspath(file_path)
            
            print(f"Extracting text from file: {file_path}")
            if not os.path.exists(file_path):
                print(f"ERROR: File does not exist: {file_path}")
                return False
            
            from app.services.book_processor import BookMetadataExtractor
            metadata_extractor = BookMetadataExtractor()
            try:
                text_content, word_count = metadata_extractor.extract_text(file_path)
                print(f"Extracted {word_count} words from file")
            except Exception as e:
                print(f"ERROR extracting text from file: {e}")
                import traceback
                traceback.print_exc()
                return False
        else:
            print(f"ERROR: No raw text found and no file path for book {book_id}")
            return False
        
        if not text_content or len(text_content.strip()) == 0:
            print(f"ERROR: Text content is empty for book {book_id}")
            return False
        
        print(f"Raw text length: {len(text_content)} characters")
        
        # Initialize processors
        vocabulary_processor = ComprehensiveVocabularyProcessor()
        dictionary_service = DictionaryService()
        
        # Extract vocabulary
        print("\nExtracting vocabulary...")
        comprehensive_analysis = vocabulary_processor.extract_all_vocabulary(
            text_content, 
            book.language
        )
        
        print(f"Extracted {comprehensive_analysis['unique_words']} unique words")
        
        # Save vocabulary with tokens
        print("\nSaving vocabulary and creating tokens...")
        vocabulary_processor.save_comprehensive_analysis_with_lemmatization(
            comprehensive_analysis,
            book_id,
            book.language,
            db,
            dictionary_service
        )
        
        # Verify tokens were created
        token_count = db.query(Token).filter(Token.book_id == book_id).count()
        lemma_count = db.query(Lemma).join(Token).filter(Token.book_id == book_id).distinct().count()
        
        print(f"\n✅ Success!")
        print(f"Created {token_count} tokens")
        print(f"Linked to {lemma_count} unique lemmas")
        
        # Update book stats
        book.unique_lemmas = lemma_count
        db.commit()
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR processing book {book_id}: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

def fix_all_books():
    """Fix tokens for all books that are missing them."""
    db = SessionLocal()
    try:
        # Find all books that are completed but have no tokens
        books = db.query(Book).all()
        books_to_fix = []
        
        for book in books:
            token_count = db.query(Token).filter(Token.book_id == book.id).count()
            if token_count == 0 and book.processing_status == "completed":
                books_to_fix.append(book.id)
        
        if not books_to_fix:
            print("No books need fixing. All books have tokens.")
            return
        
        print(f"Found {len(books_to_fix)} book(s) that need tokens:")
        for book_id in books_to_fix:
            book = db.query(Book).filter(Book.id == book_id).first()
            print(f"  - Book {book_id}: {book.title}")
        
        # Fix each book
        for book_id in books_to_fix:
            success = fix_book_tokens(book_id)
            if not success:
                print(f"Failed to fix book {book_id}")
        
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fix missing tokens for processed books")
    parser.add_argument("--book-id", type=int, help="Fix a specific book ID")
    parser.add_argument("--all", action="store_true", help="Fix all books missing tokens")
    
    args = parser.parse_args()
    
    if args.book_id:
        fix_book_tokens(args.book_id)
    elif args.all:
        fix_all_books()
    else:
        print("Please specify --book-id <id> or --all")
        parser.print_help()

