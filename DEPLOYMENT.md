# Deployment Guide for Lexeme

## Pushing to GitHub

Your code is committed and ready to push. Follow these steps:

### 1. Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right → "New repository"
3. Name it `lexeme` (or your preferred name)
4. **Do NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### 2. Connect and Push

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
cd /Users/saarhaber/Desktop/Bookabulary
git remote add origin https://github.com/YOUR_USERNAME/lexeme.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Connecting lexeme.uk Domain

### Option 1: Deploy to Vercel (Recommended for React Frontend)

1. **Push your code to GitHub** (see above)

2. **Deploy Frontend to Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in with GitHub
   - Click "Add New Project"
   - Import your repository
   - Set root directory to `frontend`
   - Build command: `npm run build`
   - Output directory: `build`
   - Click "Deploy"

3. **Deploy Backend**:
   - Option A: Use Railway, Render, or Fly.io
   - Option B: Use a VPS (DigitalOcean, Linode, etc.)

4. **Connect Domain**:
   - In Vercel dashboard → Your Project → Settings → Domains
   - Add `lexeme.uk` and `www.lexeme.uk`
   - Follow DNS instructions (add CNAME/A records)

### Option 2: Deploy to Railway (Full Stack)

1. **Push to GitHub** (see above)

2. **Deploy Backend**:
   - Go to [railway.app](https://railway.app)
   - New Project → Deploy from GitHub
   - Select your repository
   - Set root directory to `backend`
   - Add environment variables:
     - `DATABASE_URL` (Railway provides PostgreSQL, or use SQLite)
     - `CORS_ORIGINS` (add `https://lexeme.uk`)

3. **Deploy Frontend**:
   - Create another Railway service
   - Set root directory to `frontend`
   - Build command: `npm install && npm run build`
   - Start command: `npx serve -s build -l 3000`

4. **Connect Domain**:
   - Railway → Your Project → Settings → Domains
   - Add custom domain `lexeme.uk`
   - Update DNS records as instructed

### Option 3: Traditional VPS (DigitalOcean, Linode, etc.)

1. **Set up server**:
   ```bash
   # Install Node.js, Python, nginx
   sudo apt update
   sudo apt install nginx python3-pip nodejs npm
   ```

2. **Clone repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/lexeme.git
   cd lexeme
   ```

3. **Set up Backend**:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # Set up systemd service or use PM2
   ```

4. **Set up Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   # Serve with nginx or serve static files
   ```

5. **Configure Nginx**:
   ```nginx
   # /etc/nginx/sites-available/lexeme.uk
   server {
       listen 80;
       server_name lexeme.uk www.lexeme.uk;
       
       # Frontend
       location / {
           root /path/to/lexeme/frontend/build;
           try_files $uri $uri/ /index.html;
       }
       
       # Backend API
       location /api {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d lexeme.uk -d www.lexeme.uk
   ```

7. **Update DNS**:
   - Go to your domain registrar (where you bought lexeme.uk)
   - Add A record: `@` → Your server IP
   - Add A record: `www` → Your server IP

## DNS Configuration

Regardless of hosting provider, you'll need to configure DNS at your domain registrar:

### For Vercel/Railway:
- **Type**: CNAME
- **Name**: `@` or `www`
- **Value**: Provided by hosting service (e.g., `cname.vercel-dns.com`)

### For VPS:
- **Type**: A
- **Name**: `@`
- **Value**: Your server IP address
- **Type**: A
- **Name**: `www`
- **Value**: Your server IP address

## Environment Variables

Make sure to set these in your hosting platform:

### Backend:
- `DATABASE_URL` - Database connection string
- `SECRET_KEY` - For JWT tokens (generate with `openssl rand -hex 32`)

### Frontend:
- `REACT_APP_API_URL` - Backend API URL (e.g., `https://api.lexeme.uk` or `https://lexeme.uk/api`)

## Post-Deployment Checklist

- [ ] Domain resolves correctly
- [ ] HTTPS/SSL certificate installed
- [ ] Frontend loads at lexeme.uk
- [ ] Backend API accessible
- [ ] CORS configured for production domain
- [ ] Database migrations run
- [ ] File uploads directory has write permissions
- [ ] Environment variables set
- [ ] Monitoring/logging set up

## Need Help?

- Check hosting provider documentation
- Ensure CORS settings in `backend/app/main.py` include your domain
- Test API health endpoint: `https://lexeme.uk/api/health`

