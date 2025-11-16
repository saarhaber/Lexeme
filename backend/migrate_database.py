"""
Database migration script to add new fields to existing models.
Run this after updating models to migrate existing database.
"""
from sqlalchemy import text
from database import engine

def migrate_database():
    """Add new columns to existing tables."""
    with engine.connect() as conn:
        # Add reading progress fields to books table
        try:
            conn.execute(text("""
                ALTER TABLE books 
                ADD COLUMN reading_progress REAL DEFAULT 0.0
            """))
            print("✅ Added reading_progress to books table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  reading_progress column already exists")
            else:
                print(f"⚠️  Error adding reading_progress: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE books 
                ADD COLUMN last_read_position INTEGER DEFAULT 0
            """))
            print("✅ Added last_read_position to books table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  last_read_position column already exists")
            else:
                print(f"⚠️  Error adding last_read_position: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE books 
                ADD COLUMN current_chapter INTEGER DEFAULT 0
            """))
            print("✅ Added current_chapter to books table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  current_chapter column already exists")
            else:
                print(f"⚠️  Error adding current_chapter: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE books 
                ADD COLUMN total_chapters INTEGER DEFAULT 0
            """))
            print("✅ Added total_chapters to books table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  total_chapters column already exists")
            else:
                print(f"⚠️  Error adding total_chapters: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE books 
                ADD COLUMN spoiler_safe_regions TEXT DEFAULT '[]'
            """))
            print("✅ Added spoiler_safe_regions to books table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  spoiler_safe_regions column already exists")
            else:
                print(f"⚠️  Error adding spoiler_safe_regions: {e}")
        
        # Add FSRS fields to srs_progress table
        try:
            conn.execute(text("""
                ALTER TABLE srs_progress 
                ADD COLUMN stability REAL DEFAULT 0.4
            """))
            print("✅ Added stability to srs_progress table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  stability column already exists")
            else:
                print(f"⚠️  Error adding stability: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE srs_progress 
                ADD COLUMN difficulty REAL DEFAULT 0.3
            """))
            print("✅ Added difficulty to srs_progress table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  difficulty column already exists")
            else:
                print(f"⚠️  Error adding difficulty: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE srs_progress 
                ADD COLUMN book_id INTEGER
            """))
            print("✅ Added book_id to srs_progress table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  book_id column already exists")
            else:
                print(f"⚠️  Error adding book_id: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE srs_progress 
                ADD COLUMN last_review DATETIME
            """))
            print("✅ Added last_review to srs_progress table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  last_review column already exists")
            else:
                print(f"⚠️  Error adding last_review: {e}")
        
        try:
            conn.execute(text("""
                ALTER TABLE srs_progress 
                ADD COLUMN state VARCHAR(20) DEFAULT 'new'
            """))
            print("✅ Added state to srs_progress table")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("⚠️  state column already exists")
            else:
                print(f"⚠️  Error adding state: {e}")
        
        # Create reading_progress table
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS reading_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    book_id INTEGER NOT NULL,
                    character_position INTEGER DEFAULT 0,
                    chapter INTEGER DEFAULT 0,
                    paragraph INTEGER DEFAULT 0,
                    words_read INTEGER DEFAULT 0,
                    vocabulary_encountered INTEGER DEFAULT 0,
                    last_sentence TEXT,
                    safe_vocabulary_window INTEGER DEFAULT 1000,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (book_id) REFERENCES books(id)
                )
            """))
            print("✅ Created reading_progress table")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("⚠️  reading_progress table already exists")
            else:
                print(f"⚠️  Error creating reading_progress table: {e}")
        
        conn.commit()
        print("\n✅ Database migration completed!")

if __name__ == "__main__":
    migrate_database()

