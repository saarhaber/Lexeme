# 🚀 Quick Start Guide

## Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Run setup script:**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   Or manually:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python3 -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('averaged_perceptron_tagger')"
   ```

3. **Set up environment variables (optional, for Google OAuth):**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google OAuth credentials
   ```

4. **Run database migration:**
   ```bash
   source venv/bin/activate
   python3 migrate_database.py
   ```

5. **Start the backend server:**
   ```bash
   source venv/bin/activate
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Or:
   ```bash
   python3 app/main.py
   ```

## Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000` (or another port if 3000 is busy)

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure consent screen
6. Add authorized redirect URI: `http://localhost:8000/api/auth/google/callback`
7. Copy Client ID and Client Secret
8. Add them to `backend/.env`:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   FRONTEND_URL=http://localhost:3003
   ```

## Troubleshooting

### "Failed to fetch" on login
- Make sure the backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify the backend CORS settings include your frontend URL

### Database errors
- Make sure you've run the migration script
- Check that SQLite database file exists: `backend/bookabulary.db`

### Module not found errors
- Make sure virtual environment is activated: `source venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

### Google OAuth not working
- Check that environment variables are set correctly
- Verify redirect URI matches in Google Console
- Check backend logs for OAuth errors

## Testing

1. **Create an account:**
   - Click "Create Account" on homepage
   - Fill in username, email, and password
   - Click "Create Account"

2. **Or sign in with Google:**
   - Click "Sign in with Google"
   - Authorize the app
   - You'll be redirected back and logged in

3. **Upload a book:**
   - Click "Upload Your Book"
   - Select a PDF, EPUB, TXT, or DOCX file
   - Wait for processing to complete

4. **Start reading:**
   - Click on a book
   - Click "Start Reading"
   - Click words to see definitions

5. **Study vocabulary:**
   - Go to "Review" in navigation
   - Review words using spaced repetition
   - Track your progress in "Progress"

## Default Ports

- **Backend:** `http://localhost:8000`
- **Frontend:** `http://localhost:3000` (or 3003)

Make sure both are running for the app to work!

