# Lexeme repo checklist (hero dictionaries)

PR **#3** in **LexemeReader** moved hero dictionary downloads from GitHub Releases to
**[lexeme.uk](https://lexeme.uk)**. The mobile app now expects these URLs:

| What | URL |
|------|-----|
| Catalog | `https://lexeme.uk/dictionaries/catalog.json` |
| Italian hero pack | `https://lexeme.uk/dictionaries/ita-eng.db` |

Everything below is work in **this repo** ([`saarhaber/Lexeme`](https://github.com/saarhaber/Lexeme) — the Vercel project for lexeme.uk).

Starter files are copied from LexemeReader under `hosting/lexeme-uk/`. Longer explanations:
[`hosting/lexeme-uk/README.md`](../hosting/lexeme-uk/README.md).

Automated checks after changes:

```bash
./scripts/verify-dictionary-hosting.sh
```

---

## One-time setup

- [ ] **Copy the catalog into this repo**

  From LexemeReader, copy:

  ```
  hosting/lexeme-uk/frontend-public/dictionaries/catalog.json
    → frontend/public/dictionaries/catalog.json
  ```

  Commit and push. After Vercel redeploys:

  ```bash
  curl -sI https://lexeme.uk/dictionaries/catalog.json
  # expect HTTP 200
  ```

- [ ] **Create a Vercel Blob store** on the Lexeme project

  1. [Vercel dashboard](https://vercel.com) → **Lexeme** project
  2. **Storage** → **Create Database / Store** → **Blob**
  3. Name it e.g. `lexeme-dictionaries`, access **Public**

- [ ] **Install and link the Vercel CLI** (if not already)

  ```bash
  npm i -g vercel
  vercel login
  vercel link   # link to the Lexeme project
  ```

- [ ] **Build the hero pack** (in LexemeReader, not Lexeme)

  ```bash
  python3 tools/build_dictionary.py --lang italian
  # → tools/data/ita-eng.db  (~153 MB)
  ```

  Or run the publish script (build only):

  ```bash
  ./tools/publish_hero_packs.sh italian
  ```

- [ ] **Upload the `.db` to Vercel Blob**

  From LexemeReader (after `vercel link` to the Lexeme project):

  ```bash
  vercel blob put tools/data/ita-eng.db --pathname dictionaries/ita-eng.db
  ```

  The command prints a public URL like:

  ```
  https://xxxxxxxx.public.blob.vercel-storage.com/dictionaries/ita-eng.db
  ```

- [ ] **Add a `vercel.json` rewrite** so `lexeme.uk/dictionaries/ita-eng.db` proxies to Blob

  Copy `hosting/lexeme-uk/vercel.json` to `frontend/vercel.json` (Vercel root directory is `frontend`).
  Replace `BLOB_BASE_URL` with your Blob store origin (everything before `/dictionaries/`):

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

  Commit and push.

- [ ] **Deploy and verify both URLs return HTTP 200**

  ```bash
  curl -sI https://lexeme.uk/dictionaries/catalog.json
  # expect HTTP 200, content-type: application/json

  curl -sI https://lexeme.uk/dictionaries/ita-eng.db
  # expect HTTP 200, content-length: 159973376
  ```

  Or run:

  ```bash
  ./scripts/verify-dictionary-hosting.sh
  ```

- [ ] **Smoke-test hero pack download in the app**

  Open LexemeReader on a device or simulator, trigger a hero pack download, and confirm it completes using the lexeme.uk URLs (not GitHub Releases).

---

## On future pack updates

- [ ] **Build and publish from LexemeReader**

  ```bash
  ./tools/publish_hero_packs.sh italian --lexeme-uk
  ```

  This rebuilds the pack, uploads to Vercel Blob, and prints updated `size_bytes`, `sha512`, and `version`.

- [ ] **Update `catalog.json` in both repos**

  Edit both copies so they stay in sync:

  - `frontend/public/dictionaries/catalog.json` (this repo)
  - `hosting/lexeme-uk/frontend-public/dictionaries/catalog.json` (LexemeReader)

  Update `size_bytes`, `sha512`, and `version` for the changed pack.

- [ ] **Commit, push, and redeploy**

  Push Lexeme (catalog + any config changes) and LexemeReader (bundled fallback asset under `assets/hero_packs/`).

- [ ] **Re-run verification**

  ```bash
  ./scripts/verify-dictionary-hosting.sh
  ```

---

## Why Blob, not `public/`?

The full Italian hero pack is ~153 MB. Vercel's deployment bundle limit (100 MB on Hobby) makes it unsuitable to commit into `frontend/public/`. Use **Vercel Blob** for large `.db` files; only the small `catalog.json` lives in git.

## App fallback

If lexeme.uk is unreachable, LexemeReader falls back to:

1. Bundled `assets/hero_packs/catalog.json`
2. Bundled `assets/hero_packs/ita-eng.db` (~3 MB FreeDict-based pack)

---

## Status (last automated run)

| Check | Result |
|-------|--------|
| Catalog in repo (`frontend/public` + `hosting/lexeme-uk` template) | Pass |
| Frontend build | Pass |
| Live catalog (`/dictionaries/catalog.json`) | Pass |
| Live hero pack (`/dictionaries/ita-eng.db`) | **Fail** — rewrite still uses `BLOB_BASE_URL` placeholder; endpoint returns HTML |
| Placeholder site (`/`) | Pass |

**Remaining one-time work:** create Blob store, upload `ita-eng.db`, replace `BLOB_BASE_URL` in `frontend/vercel.json`, redeploy.
