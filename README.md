# Lexeme

Learn vocabulary from books you love—without spoilers. Upload any book in any language and master vocabulary in context.

## Features

- 📖 **Read Any Book** - Upload PDFs, EPUBs, or text files in any language
- 🔍 **Click to Learn** - Click any word while reading to see its definition instantly
- 🚫 **Zero Spoilers** - Only shows vocabulary from text you've already read
- 🎯 **Smart Review** - Spaced repetition helps you remember words long-term
- 📊 **Track Progress** - Watch your vocabulary grow as you read more books

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python + SQLite
- **NLP**: spaCy + NLTK for vocabulary extraction
- **SRS**: FSRS algorithm for spaced repetition

## Quick Start

1. **Backend Setup**:
   ```bash
   cd backend
   ./setup.sh
   source venv/bin/activate
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Or use the start script**:
   ```bash
   ./START_SERVERS.sh
   ```

## Production

The app is configured to run at [lexeme.uk](https://lexeme.uk).

## License

MIT
