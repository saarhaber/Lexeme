# 🔧 Setup Instructions

## Issue 1: Virtual Environment & Dependencies

You're getting "ModuleNotFoundError: No module named 'sqlalchemy'" because you need to activate the virtual environment first.

### Quick Fix:

```bash
cd backend
source venv/bin/activate  # Activate virtual environment
pip install -r requirements.txt  # Install dependencies
python3 migrate_database.py  # Run migration
```

### Or use the setup script:

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

This will:
- Create virtual environment if it doesn't exist
- Install all dependencies
- Download NLTK data

## Issue 2: "Failed to fetch" on Sign In

This happens when:
1. **Backend is not running** - Make sure backend is running on port 8000
2. **CORS issues** - Backend CORS is configured, but make sure frontend URL matches
3. **Network error** - Check browser console for details

### To fix:

1. **Start the backend:**
   ```bash
   cd backend
   source venv/bin/activate
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Check backend is running:**
   - Visit: http://localhost:8000/health
   - Should see: `{"status": "healthy", "message": "Bookabulary API is running"}`

3. **Check frontend URL:**
   - Make sure frontend is running on one of: 3000, 3001, 3002, 3003, 5173, 5174
   - Backend CORS is configured for these ports

## Issue 3: Google Sign-In Setup

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable "Google+ API" or "Google Identity Services"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - User type: External
   - App name: Bookabulary
   - Support email: your email
   - Authorized domains: localhost (for development)
6. Create OAuth client:
   - Application type: Web application
   - Name: Bookabulary Dev
   - Authorized redirect URIs: `http://localhost:8000/api/auth/google/callback`
7. Copy **Client ID** and **Client Secret**

### Step 2: Configure Backend

1. Create `.env` file in `backend/` directory:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and add:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   FRONTEND_URL=http://localhost:3003
   ```

3. Install OAuth dependencies:
   ```bash
   source venv/bin/activate
   pip install authlib httpx
   ```

4. Restart backend server

### Step 3: Test Google Sign-In

1. Click "Sign in with Google" on homepage
2. You'll be redirected to Google
3. Authorize the app
4. You'll be redirected back and logged in

## Troubleshooting

### Backend won't start
- Check Python version: `python3 --version` (should be 3.8+)
- Make sure virtual environment is activated
- Check if port 8000 is already in use: `lsof -i :8000`

### Google OAuth not working
- Check `.env` file exists and has correct values
- Verify redirect URI matches exactly: `http://localhost:8000/api/auth/google/callback`
- Check backend logs for OAuth errors
- Make sure `authlib` and `httpx` are installed

### Still getting "Failed to fetch"
- Open browser DevTools → Network tab
- Try to sign in and check the failed request
- Look at the error message
- Common issues:
  - Backend not running → Start backend
  - Wrong URL → Check API_BASE_URL in frontend
  - CORS error → Check backend CORS config
  - Network error → Check firewall/antivirus

## Quick Test

1. **Backend health check:**
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status":"healthy","message":"Bookabulary API is running"}`

2. **Test login endpoint:**
   ```bash
   curl -X POST http://localhost:8000/api/auth/login-json \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

3. **Check frontend can reach backend:**
   - Open browser console
   - Type: `fetch('http://localhost:8000/health').then(r => r.json()).then(console.log)`
   - Should see health response

## Next Steps

Once everything is set up:
1. Create an account or sign in with Google
2. Upload a book
3. Start reading and learning vocabulary!

For more details, see `QUICK_START.md`

