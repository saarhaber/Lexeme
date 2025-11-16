from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from app.routers import books, upload, vocab, srs, auth, reading, vocab_lists, export, audio
from app.models import Base
from database import engine

# Create FastAPI app
app = FastAPI(
    title="Lexeme API",
    description="A universal, spoiler-free vocabulary learning app for any book in any language",
    version="1.0.0"
)

# Configure CORS - Allow both React dev server ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3003", 
        "http://127.0.0.1:3003",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",  # Vite default
        "http://localhost:5174",  # Vite alternative
        "https://lexeme.uk",  # Production domain
        "https://www.lexeme.uk",  # Production domain with www
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(vocab.router, prefix="/api/vocab", tags=["Vocabulary"])
app.include_router(srs.router, prefix="/api/srs", tags=["Spaced Repetition"])
app.include_router(reading.router, prefix="/api/reading", tags=["Reading Mode"])
app.include_router(vocab_lists.router, prefix="/api/vocab-lists", tags=["Vocabulary Lists"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Lexeme API is running"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
