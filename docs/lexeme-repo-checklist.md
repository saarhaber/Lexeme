# Lexeme repo checklist

Run this after changes to dictionary hosting or the placeholder site. Automated checks:

```bash
./scripts/verify-dictionary-hosting.sh
```

## 1. Placeholder frontend

- [ ] `frontend/src/App.tsx` is the minimal coming-soon page (no auth, routes, or API client code)
- [ ] `frontend/public/index.html` and `manifest.json` use Lexeme branding
- [ ] `cd frontend && npm ci && npm run build` succeeds
- [ ] `frontend/build/dictionaries/catalog.json` exists after build

## 2. Dictionary catalog in git

- [ ] `frontend/public/dictionaries/catalog.json` exists
- [ ] It matches `hosting/lexeme-uk/frontend-public/dictionaries/catalog.json`
- [ ] Each pack has: `name`, `source`, `headwords`, `size_bytes`, `download_url`, `sha512`, `version`
- [ ] `download_url` points at `https://lexeme.uk/dictionaries/<name>.db`

## 3. Vercel rewrite for hero packs

Large `.db` files live in **Vercel Blob**, not in `public/` (Hobby deploy limit is 100 MB; the Italian pack is ~153 MB).

- [ ] `frontend/vercel.json` exists with a rewrite for `/dictionaries/ita-eng.db`
- [ ] `BLOB_BASE_URL` in `frontend/vercel.json` is replaced with your Blob store origin (not the literal placeholder)
- [ ] Blob store is public (e.g. `lexeme-dictionaries`)

Upload (from LexemeReader after building the pack):

```bash
vercel blob put tools/data/ita-eng.db --pathname dictionaries/ita-eng.db
```

Full steps: [`hosting/lexeme-uk/README.md`](../hosting/lexeme-uk/README.md)

## 4. Production verification

After deploy:

```bash
curl -sI https://lexeme.uk/dictionaries/catalog.json
# HTTP/2 200, content-type: application/json

curl -sI https://lexeme.uk/dictionaries/ita-eng.db
# HTTP/2 200, content-length: 159973376

curl -sI https://lexeme.uk/
# HTTP/2 200, text/html
```

## 5. Updating a pack later

1. Build the new `.db` in LexemeReader
2. `vercel blob put … --pathname dictionaries/ita-eng.db`
3. Update `size_bytes`, `sha512`, and `version` in both catalog copies
4. Commit, push, redeploy Lexeme; update bundled fallback in LexemeReader

## Status (last run)

| Check | Result |
|-------|--------|
| Catalog files in repo | Pass |
| Frontend build | Pass |
| Live catalog | Pass |
| Live hero pack (`ita-eng.db`) | **Fail** — rewrite still uses `BLOB_BASE_URL` placeholder; endpoint returns HTML |
| Placeholder site | Pass |
