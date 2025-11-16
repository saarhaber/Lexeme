#!/bin/bash

# Setup script for Lexeme backend
echo "🚀 Setting up Lexeme backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Download NLTK data
echo "📥 Downloading NLTK data..."
python3 -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('averaged_perceptron_tagger')"

echo "✅ Setup complete!"
echo ""
echo "To activate the virtual environment, run:"
echo "  source venv/bin/activate"
echo ""
echo "To run the backend server:"
echo "  python3 app/main.py"
echo ""
echo "Or use uvicorn directly:"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

