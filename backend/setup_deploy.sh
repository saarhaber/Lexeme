#!/bin/bash
# Setup script for production deployment
# This runs after dependencies are installed

echo "🔧 Setting up Lexeme backend for production..."

# Download NLTK data
echo "📥 Downloading NLTK data..."
python3 -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('averaged_perceptron_tagger')" || true

# Download spaCy models (most common languages)
echo "📥 Downloading spaCy language models..."
python3 -m spacy download en_core_web_sm || true
python3 -m spacy download it_core_news_sm || true
python3 -m spacy download es_core_news_sm || true
python3 -m spacy download fr_core_news_sm || true
python3 -m spacy download de_core_news_sm || true

# Initialize database if it doesn't exist
echo "🗄️  Initializing database..."
python3 init_db.py || true

echo "✅ Setup complete!"

