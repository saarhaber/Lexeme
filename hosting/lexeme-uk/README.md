# Host LexemeReader dictionaries on lexeme.uk

Hero dictionary packs for the **LexemeReader** mobile app are hosted on [lexeme.uk](https://lexeme.uk) — not on the private LexemeReader GitHub repo.

| URL | What | Where it lives |
|-----|------|----------------|
| `https://lexeme.uk/dictionaries/catalog.json` | Pack list + checksums | `frontend/public/dictionaries/catalog.json` |
| `https://lexeme.uk/dictionaries/ita-eng.db` | Italian hero dictionary (~153 MB) | Vercel Blob + `vercel.json` rewrite |

The mobile app fetches the catalog first, then downloads `.db` files with a plain HTTP GET. No GitHub authentication is involved.

## Why not GitHub Releases?

LexemeReader is private. GitHub returns HTTP 404 to unauthenticated clients for private-repo release assets. Hosting on lexeme.uk keeps the app repo private while still giving users a public download URL.

## Why not `public/` in the Lexeme repo?

The full hero pack is ~153 MB. Vercel's deployment bundle limit (100 MB on Hobby) makes it unsuitable to commit into `frontend/public/`. Use **Vercel Blob** for the large `.db` file; only the small `catalog.json` lives in the repo.

## Step 1 — Add the catalog

Copy into your Lexeme project:

```
hosting/lexeme-uk/frontend-public/dictionaries/catalog.json
  → frontend/public/dictionaries/catalog.json
```

Commit and push. After Vercel redeploys, check:

```bash
curl -sI https://lexeme.uk/dictionaries/catalog.json
# expect HTTP/2 200
```

## Step 2 — Create a Vercel Blob store

1. Open the **Lexeme** project in the [Vercel dashboard](https://vercel.com).
2. Go to **Storage** → **Create Database / Store** → **Blob**.
3. Name it e.g. `lexeme-dictionaries`, set access to **Public**.

Install the CLI if needed:

```bash
npm i -g vercel
vercel login
vercel link   # link to the Lexeme project
```

## Step 3 — Upload the hero pack

Build the dictionary in the LexemeReader repo (or download the existing file):

```bash
# In LexemeReader:
python3 tools/build_dictionary.py --lang italian
# → tools/data/ita-eng.db  (~153 MB)
```

Upload to Blob:

```bash
vercel blob put tools/data/ita-eng.db --pathname dictionaries/ita-eng.db
```

The command prints a public URL like:

```
https://xxxxxxxx.public.blob.vercel-storage.com/dictionaries/ita-eng.db
```

## Step 4 — Add a rewrite in vercel.json

Copy `hosting/lexeme-uk/vercel.json` to `frontend/vercel.json` (Vercel root directory is `frontend` for this project). Replace `BLOB_BASE_URL` with your Blob store's public origin (everything before `/dictionaries/`):

```json
{
  "rewrites": [
    {
      "source": "/dictionaries/ita-eng.db",
      "destination": "https://xxxxxxxx.public.blob.vercel-storage.com/dictionaries/ita-eng.db"
    }
  ]
}
```

Commit, push, wait for deploy, then verify:

```bash
curl -sI https://lexeme.uk/dictionaries/ita-eng.db
# expect HTTP/2 200 and content-length: 159973376
```

## Step 5 — Updating a pack later

1. Build the new `.db` in LexemeReader.
2. `vercel blob put … --pathname dictionaries/ita-eng.db` (overwrites).
3. Update `catalog.json` with new `size_bytes`, `sha512`, and `version`.
4. Push Lexeme (catalog) and LexemeReader (bundled fallback asset).

## Optional — serve catalog from Blob too

If you prefer not to redeploy the site when only the catalog changes, upload `catalog.json` to Blob and add a second rewrite. The small file in `public/` is simpler for most updates.

## Costs

Vercel Blob on Hobby includes a free tier. A 153 MB file stored once costs a few cents per month; each user download counts as data transfer. For a niche reader app this is typically negligible. See [Vercel Blob pricing](https://vercel.com/docs/storage/vercel-blob/usage-and-pricing).

## Fallback in the app

If lexeme.uk is unreachable, the app falls back to:

1. Bundled `assets/hero_packs/catalog.json`
2. Bundled `assets/hero_packs/ita-eng.db` (~3 MB FreeDict-based pack)
