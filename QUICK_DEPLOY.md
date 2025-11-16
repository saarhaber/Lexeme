# Quick Deployment Guide - Lexeme

## 🚀 Fastest Way: Railway (5 minutes)

### Backend Deployment

1. **Go to Railway**: https://railway.app → Sign in with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `saarhaber/Lexeme`

3. **Configure Backend**:
   - Click on the service
   - Settings → Root Directory: `backend`
   - Settings → Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Add Database** (Optional but recommended):
   - Click "+ New" → "Database" → "PostgreSQL"
   - Railway sets `DATABASE_URL` automatically

5. **Add Environment Variables**:
   - Go to Variables tab
   - Add `SECRET_KEY`: Generate with `openssl rand -hex 32` or use Railway's generator

6. **Get Backend URL**:
   - Once deployed, copy the URL (e.g., `https://lexeme-production.up.railway.app`)
   - Test: `https://your-url/api/health`

### Frontend Deployment (Vercel)

1. **Go to Vercel**: https://vercel.com → Sign in with GitHub

2. **Import Project**:
   - "Add New Project"
   - Import `saarhaber/Lexeme`

3. **Configure**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Environment Variable: `REACT_APP_API_URL` = Your Railway backend URL + `/api`

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment

### Connect Domain

1. **In Vercel**:
   - Settings → Domains
   - Add `lexeme.uk` and `www.lexeme.uk`

2. **At Domain Registrar**:
   - Add CNAME record: `@` → Vercel's provided domain
   - Or add A records as shown by Vercel

3. **Update Backend CORS** (if needed):
   - Already configured in `backend/app/main.py` ✅

## ✅ Done!

Your app should now be live at https://lexeme.uk!

## Troubleshooting

- **Backend not responding?** Check Railway logs
- **CORS errors?** Verify `REACT_APP_API_URL` is correct
- **Database issues?** Check Railway database logs
- **Domain not working?** Wait 24-48 hours for DNS propagation

