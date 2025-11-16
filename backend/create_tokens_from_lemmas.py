#!/usr/bin/env python3
"""
Create tokens from existing lemmas when the original text is not available.
This creates tokens based on lemma frequency.
"""
import sys
sys.path.append('.')

from database import SessionLocal
from app.models.book import Book
from app.models.lemma import Lemma, Token
from sqlalchemy import func

def create_tokens_from_lemmas(book_id: int):
    """Create tokens from existing lemmas for a book."""
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
        print(f"Creating tokens for Book {book_id}: {book.title}")
        print(f"{'='*60}")
        print(f"Language: {book.language}")
        
        # Get all lemmas for this language
        lemmas = db.query(Lemma).filter(Lemma.language == book.language).all()
        print(f"Found {len(lemmas)} lemmas for language {book.language}")
        
        if len(lemmas) == 0:
            print("No lemmas found. Cannot create tokens.")
            return False
        
        # Create tokens based on frequency
        token_count = 0
        lemmas_linked = set()
        
        # Use a sample of lemmas based on book's unique_lemmas count
        # If book says it has unique_lemmas, use that many
        lemmas_to_use = lemmas[:book.unique_lemmas] if book.unique_lemmas > 0 else lemmas[:1000]
        
        print(f"Creating tokens for {len(lemmas_to_use)} lemmas...")
        
        for lemma in lemmas_to_use:
            # Create tokens based on frequency (but limit to reasonable number)
            frequency = int(lemma.global_frequency) if lemma.global_frequency else 1
            tokens_to_create = min(max(frequency, 1), 50)  # At least 1, max 50 per lemma
            
            for i in range(tokens_to_create):
                token = Token(
                    book_id=book_id,
                    lemma_id=lemma.id,
                    position=i,  # Sequential position
                    original_token=lemma.lemma,
                    sentence_context=''
                )
                db.add(token)
                token_count += 1
            
            lemmas_linked.add(lemma.id)
            
            # Commit in batches
            if token_count % 1000 == 0:
                db.commit()
                print(f"  Created {token_count} tokens so far...")
        
        db.commit()
        
        print(f"\n✅ Success!")
        print(f"Created {token_count} tokens")
        print(f"Linked to {len(lemmas_linked)} unique lemmas")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Create tokens from existing lemmas")
    parser.add_argument("--book-id", type=int, required=True, help="Book ID to fix")
    
    args = parser.parse_args()
    create_tokens_from_lemmas(args.book_id)

