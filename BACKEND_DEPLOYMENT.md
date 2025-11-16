# Backend Deployment Guide for Lexeme

## Option 1: Railway (Recommended - Easiest)

Railway is the easiest platform for deploying Python/FastAPI backends.

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub
1. Select "Deploy from GitHub repo"
2. Choose `saarhaber/Lexeme` repository
3. Railway will detect it's a Python project

### Step 3: Configure Service
1. Click on the service → Settings
2. Set **Root Directory** to: `backend`
3. Set **Start Command** to: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 4: Add PostgreSQL Database (Recommended)
1. In Railway dashboard, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically set `DATABASE_URL` environment variable

### Step 5: Environment Variables
Go to Variables tab and add:

- `DATABASE_URL` - Automatically set if you added PostgreSQL, or use SQLite: `sqlite:///./lexeme.db`
- `SECRET_KEY` - Generate with: `openssl rand -hex 32` (for JWT tokens)
- `PYTHON_VERSION` - Set to `3.11`

### Step 6: Build Command (Optional)
Railway auto-detects, but you can add:
```bash
pip install -r requirements.txt && python3 setup_deploy.sh
```

### Step 7: Deploy
1. Railway will automatically deploy
2. Once deployed, copy the generated URL (e.g., `https://lexeme-production.up.railway.app`)
3. Update your Vercel frontend environment variable:
   - `REACT_APP_API_URL` = `https://lexeme-production.up.railway.app/api`

### Step 8: Custom Domain (Optional)
1. In Railway → Settings → Networking
2. Click "Generate Domain" or add custom domain
3. Add `api.lexeme.uk` (or your preferred subdomain)
4. Update DNS at your registrar

---

## Option 2: Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign in with GitHub

### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect `saarhaber/Lexeme` repository

### Step 3: Configure Service
- **Name**: `lexeme-backend`
- **Environment**: `Python 3`
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt && python3 setup_deploy.sh`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 4: Add PostgreSQL Database
1. Click "New +" → "PostgreSQL"
2. Render will set `DATABASE_URL` automatically

### Step 5: Environment Variables
Add these in the Environment tab:
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `PYTHON_VERSION` - `3.11`

### Step 6: Deploy
1. Click "Create Web Service"
2. Once deployed, copy the URL
3. Update Vercel frontend: `REACT_APP_API_URL` = `https://lexeme-backend.onrender.com/api`

---

## Option 3: Fly.io

### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login
```bash
fly auth login
```

### Step 3: Create App
```bash
cd backend
fly launch
```

### Step 4: Configure fly.toml
Create `backend/fly.toml`:
```toml
app = "lexeme-backend"
primary_region = "iad"

[build]

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 8080
```

### Step 5: Deploy
```bash
fly deploy
```

---

## Database Initialization

The database will be initialized automatically on first run via `init_db.py`. If you need to manually initialize:

```bash
python3 init_db.py
```

## Post-Deployment Checklist

- [ ] Backend is accessible at the deployment URL
- [ ] Health check works: `https://your-backend-url/api/health`
- [ ] Database is initialized (check logs)
- [ ] CORS is configured for `https://lexeme.uk`
- [ ] Environment variables are set
- [ ] Frontend `REACT_APP_API_URL` points to backend
- [ ] Test API endpoints work

## Troubleshooting

### Database Issues
- If using SQLite, ensure the file has write permissions
- For PostgreSQL, check connection string format
- Run `python3 init_db.py` manually if tables aren't created

### spaCy Models Not Found
- Models are downloaded in `setup_deploy.sh`
- Check build logs to ensure models downloaded successfully
- You can manually download: `python3 -m spacy download en_core_web_sm`

### CORS Errors
- Ensure `https://lexeme.uk` is in CORS origins in `app/main.py`
- Check that frontend URL matches exactly

### Port Issues
- Railway/Render set `$PORT` automatically
- Ensure start command uses `--port $PORT`

## Recommended: Use PostgreSQL

For production, switch from SQLite to PostgreSQL:

1. Add PostgreSQL service in Railway/Render
2. `DATABASE_URL` will be set automatically
3. Update `requirements.txt` to include: `psycopg2-binary==2.9.9`
4. Redeploy

The code already supports PostgreSQL - just change the `DATABASE_URL`!

