from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import traceback

from app.routers import books, upload, vocab, srs, auth, reading, vocab_lists, export, audio
from app.models import Base
from database import engine

# Create FastAPI app
app = FastAPI(
    title="Lexeme API",
    description="A universal, spoiler-free vocabulary learning app for any book in any language",
    version="1.0.0"
)

# Configure CORS - Allow both React dev server ports and production domain
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
        "https://lexeme-production.up.railway.app",  # Railway domain (for direct API access)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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

# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are included"""
    print(f"Unhandled exception: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": str(exc),
            "type": type(exc).__name__
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Lexeme API is running"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
