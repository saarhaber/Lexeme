# Lexeme

Website and dictionary hosting for the Lexeme app at [lexeme.uk](https://lexeme.uk).

## Dictionary hosting

Hero dictionary packs for **LexemeReader** are served from this site:

| File | URL |
|------|-----|
| Catalog | `https://lexeme.uk/dictionaries/catalog.json` |
| Italian hero pack | `https://lexeme.uk/dictionaries/ita-eng.db` |

Setup instructions (Vercel Blob, rewrites, uploads) are in [`hosting/lexeme-uk/README.md`](hosting/lexeme-uk/README.md).

Run the repo checklist and automated checks:

```bash
./scripts/verify-dictionary-hosting.sh
```

See [`docs/lexeme-repo-checklist.md`](docs/lexeme-repo-checklist.md).

## Frontend

Marketing landing page for LexemeReader, deployed from `frontend/` on Vercel.

```bash
cd frontend
npm install
npm start
```

## License

MIT
