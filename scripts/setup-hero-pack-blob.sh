#!/usr/bin/env bash
# One-shot hero pack setup for lexeme.uk:
#   1. Upload ita-eng.db to Vercel Blob
#   2. Patch frontend/vercel.json rewrite destination
#   3. Run ./scripts/verify-dictionary-hosting.sh (local checks)
#
# Usage:
#   BLOB_READ_WRITE_TOKEN=... ./scripts/setup-hero-pack-blob.sh /path/to/ita-eng.db
#   VERCEL_TOKEN=... ./scripts/setup-hero-pack-blob.sh /path/to/ita-eng.db
#
# Build the pack in LexemeReader first:
#   python3 tools/build_dictionary.py --lang italian
#   # or: ./tools/publish_hero_packs.sh italian
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${1:-${DB_PATH:-}}"
BLOB_PATHNAME="${BLOB_PATHNAME:-dictionaries/ita-eng.db}"
VERCEL_JSON="$ROOT/frontend/vercel.json"
EXPECTED_SIZE=159973376
EXPECTED_SHA512="bf918a56c0dc91a45335fb9d30fd2fe504757dae181707b3ed6eaaf8ebade05c5f13f28bb9fbbaf4943e8ba0b648944e294f6acabdbe7c538a1713fcf34d854b"

if [[ -z "$DB_PATH" || ! -f "$DB_PATH" ]]; then
  echo "Usage: BLOB_READ_WRITE_TOKEN=... $0 /path/to/ita-eng.db" >&2
  echo "Build in LexemeReader: python3 tools/build_dictionary.py --lang italian" >&2
  exit 1
fi

actual_size="$(wc -c < "$DB_PATH" | tr -d ' ')"
if [[ "$actual_size" != "$EXPECTED_SIZE" ]]; then
  echo "WARN: $DB_PATH is ${actual_size} bytes (catalog expects ${EXPECTED_SIZE}). Continuing anyway." >&2
fi

if command -v sha512sum >/dev/null 2>&1; then
  actual_sha="$(sha512sum "$DB_PATH" | awk '{print $1}')"
  if [[ "$actual_sha" != "$EXPECTED_SHA512" ]]; then
    echo "WARN: sha512 mismatch — update catalog.json if this is an intentional new pack." >&2
  fi
fi

upload_with_blob_token() {
  local token="$1"
  echo "Uploading to Vercel Blob (multipart) ..."
  curl -fsS -X PUT "https://blob.vercel-storage.com/?pathname=${BLOB_PATHNAME}&multipart=true" \
    -H "Authorization: Bearer ${token}" \
    -H "x-access: public" \
    -H "x-content-type: application/octet-stream" \
    --data-binary @"$DB_PATH"
}

upload_with_vercel_cli() {
  local token="$1"
  echo "Uploading via Vercel CLI ..."
  (cd "$ROOT/frontend" && npx --yes vercel@latest blob put "$DB_PATH" \
    --pathname "$BLOB_PATHNAME" \
    --token "$token")
}

if [[ -n "${BLOB_READ_WRITE_TOKEN:-}" ]]; then
  response="$(upload_with_blob_token "$BLOB_READ_WRITE_TOKEN")"
elif [[ -n "${VERCEL_TOKEN:-}" ]]; then
  response="$(upload_with_vercel_cli "$VERCEL_TOKEN")"
else
  echo "Set BLOB_READ_WRITE_TOKEN or VERCEL_TOKEN (from Vercel → Storage → Blob store)." >&2
  exit 1
fi

blob_url="$(python3 - <<'PY' "$response"
import json, sys
raw = sys.argv[1].strip()
try:
    data = json.loads(raw)
except json.JSONDecodeError:
    # vercel CLI may print a bare URL
    print(raw.splitlines()[-1])
    raise SystemExit(0)
print(data.get("url") or data.get("downloadUrl") or "")
PY
)"

if [[ -z "$blob_url" || "$blob_url" != http* ]]; then
  echo "Upload succeeded but could not parse Blob URL from response:" >&2
  echo "$response" >&2
  exit 1
fi

echo "Blob URL: $blob_url"

python3 - <<'PY' "$VERCEL_JSON" "$blob_url"
import json, pathlib, sys
path = pathlib.Path(sys.argv[1])
blob_url = sys.argv[2]
data = json.loads(path.read_text())
for rule in data.get("rewrites", []):
    if rule.get("source") == "/dictionaries/ita-eng.db":
        rule["destination"] = blob_url
        break
else:
    data.setdefault("rewrites", []).append({
        "source": "/dictionaries/ita-eng.db",
        "destination": blob_url,
    })
path.write_text(json.dumps(data, indent=2) + "\n")
print(f"Updated {path}")
PY

echo
echo "Next: commit frontend/vercel.json, push, wait for Vercel deploy, then:"
echo "  ./scripts/verify-dictionary-hosting.sh"
