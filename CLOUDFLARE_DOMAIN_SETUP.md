# Connecting lexeme.uk Domain (Cloudflare) to Your App

## Overview
- **Frontend (Vercel)**: `lexeme.uk` and `www.lexeme.uk` → Your React app
- **Backend (Railway)**: `api.lexeme.uk` → Your FastAPI backend (optional but recommended)

---

## Step 1: Connect Frontend Domain to Vercel

### In Vercel:
1. Go to your Vercel project dashboard
2. Click on your **Lexeme** project
3. Go to **Settings** → **Domains**
4. Click **Add Domain**
5. Enter: `lexeme.uk`
6. Click **Add**
7. Also add: `www.lexeme.uk`

### Vercel will show you DNS records to add:
You'll see something like:
- **Type**: CNAME
- **Name**: `@` (or root)
- **Value**: `cname.vercel-dns.com` (or similar)

---

## Step 2: Configure DNS in Cloudflare

### Go to Cloudflare Dashboard:
1. Log in to [Cloudflare](https://dash.cloudflare.com)
2. Select your domain `lexeme.uk`
3. Go to **DNS** → **Records**

### Add DNS Records:

#### For Frontend (Vercel):
1. **Add CNAME Record**:
   - **Type**: CNAME
   - **Name**: `@` (or leave blank for root domain)
   - **Target**: The value Vercel provided (e.g., `cname.vercel-dns.com`)
   - **Proxy status**: 🟠 Proxied (orange cloud) - This enables Cloudflare CDN
   - Click **Save**

2. **Add CNAME Record for www**:
   - **Type**: CNAME
   - **Name**: `www`
   - **Target**: The value Vercel provided (same as above)
   - **Proxy status**: 🟠 Proxied
   - Click **Save**

#### For Backend (Railway) - Optional but Recommended:
1. **Add CNAME Record**:
   - **Type**: CNAME
   - **Name**: `api`
   - **Target**: Your Railway domain (e.g., `lexeme-production.up.railway.app`)
   - **Proxy status**: 🟡 DNS only (gray cloud) - Backend shouldn't use Cloudflare proxy
   - Click **Save**

---

## Step 3: Configure Backend Domain in Railway (Optional)

### In Railway:
1. Go to your backend service
2. Click **Settings** → **Networking**
3. Click **Generate Domain** (if not already done)
4. Copy the Railway domain (e.g., `lexeme-production.up.railway.app`)
5. Or add custom domain: `api.lexeme.uk`
6. Railway will show DNS records if using custom domain

### If Railway asks for DNS records:
- Add a CNAME record in Cloudflare:
  - **Name**: `api`
  - **Target**: Railway's provided domain
  - **Proxy**: DNS only (gray cloud)

---

## Step 4: Update Frontend Environment Variable

### In Vercel:
1. Go to your project → **Settings** → **Environment Variables**
2. Update `REACT_APP_API_URL`:
   - **If using Railway subdomain**: `https://api.lexeme.uk/api`
   - **If using Railway default**: `https://your-railway-url.up.railway.app/api`

3. **Redeploy** the frontend (Vercel will auto-redeploy, or click "Redeploy")

---

## Step 5: Verify CORS Settings

The backend already has `https://lexeme.uk` and `https://www.lexeme.uk` in CORS settings ✅

If you're using `api.lexeme.uk` for the backend, make sure CORS includes the frontend domain (already done).

---

## Step 6: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Cloudflare usually propagates within **5-15 minutes**
- You can check propagation at: https://www.whatsmydns.net

---

## Step 7: Test Your Setup

### Test Frontend:
1. Visit: `https://lexeme.uk`
2. Should load your React app

### Test Backend:
1. Visit: `https://api.lexeme.uk/api/health` (or your Railway URL)
2. Should return: `{"status": "healthy", "message": "Lexeme API is running"}`

### Test Connection:
1. Open browser console on `lexeme.uk`
2. Check Network tab - API calls should go to your backend
3. No CORS errors should appear

---

## Troubleshooting

### Domain Not Working?
- **Check Cloudflare SSL/TLS**: Settings → SSL/TLS → Set to **Full** or **Full (strict)**
- **Check DNS records**: Make sure they're saved correctly
- **Wait longer**: DNS can take up to 48 hours (usually much faster)

### CORS Errors?
- Verify `REACT_APP_API_URL` is correct in Vercel
- Check backend CORS includes `https://lexeme.uk`
- Make sure both use HTTPS (not HTTP)

### Backend Not Accessible?
- Check Railway service is running
- Verify Railway domain is correct
- Check Railway logs for errors

### SSL Certificate Issues?
- Cloudflare provides free SSL automatically
- Vercel provides SSL automatically
- Railway provides SSL automatically
- Make sure SSL/TLS mode in Cloudflare is set correctly

---

## Quick Checklist

- [ ] Added `lexeme.uk` domain in Vercel
- [ ] Added `www.lexeme.uk` domain in Vercel
- [ ] Added CNAME records in Cloudflare for frontend
- [ ] Added CNAME record in Cloudflare for `api` subdomain (if using)
- [ ] Updated `REACT_APP_API_URL` in Vercel environment variables
- [ ] Set Cloudflare SSL/TLS to Full
- [ ] Waited for DNS propagation
- [ ] Tested frontend at `https://lexeme.uk`
- [ ] Tested backend health endpoint
- [ ] Verified no CORS errors

---

## Example DNS Records in Cloudflare

```
Type    Name    Content                          Proxy
CNAME   @       cname.vercel-dns.com            🟠 Proxied
CNAME   www     cname.vercel-dns.com            🟠 Proxied
CNAME   api     lexeme-production.up.railway.app 🟡 DNS only
```

---

## Need Help?

- **Cloudflare Docs**: https://developers.cloudflare.com/dns/
- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **Railway Docs**: https://docs.railway.app/develop/public-networking

