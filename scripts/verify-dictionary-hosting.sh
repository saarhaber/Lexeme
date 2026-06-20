#!/usr/bin/env bash
# Verify Lexeme dictionary hosting setup (local repo + optional live checks).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
CATALOG_A="$FRONTEND/public/dictionaries/catalog.json"
CATALOG_B="$ROOT/hosting/lexeme-uk/frontend-public/dictionaries/catalog.json"
VERCEL_JSON="$FRONTEND/vercel.json"
BASE_URL="${LEXEME_BASE_URL:-https://lexeme.uk}"

pass=0
fail=0
warn=0

ok() {
  echo "  OK   $1"
  pass=$((pass + 1))
}

bad() {
  echo "  FAIL $1"
  fail=$((fail + 1))
}

note() {
  echo "  WARN $1"
  warn=$((warn + 1))
}

echo "== Lexeme dictionary hosting verification =="
echo

echo "1. Catalog files"
if [[ -f "$CATALOG_A" && -f "$CATALOG_B" ]]; then
  ok "catalog.json present in frontend/public and hosting template"
else
  bad "missing catalog.json (expected at frontend/public and hosting template)"
fi

if diff -q "$CATALOG_A" "$CATALOG_B" >/dev/null 2>&1; then
  ok "catalog files match"
else
  bad "catalog files differ — sync hosting/lexeme-uk/frontend-public with frontend/public"
fi

echo
echo "2. vercel.json rewrite"
if [[ -f "$VERCEL_JSON" ]]; then
  ok "frontend/vercel.json exists"
  if grep -q 'BLOB_BASE_URL' "$VERCEL_JSON"; then
    bad "frontend/vercel.json still contains BLOB_BASE_URL placeholder — replace with Blob store origin"
  else
    ok "BLOB_BASE_URL placeholder replaced"
  fi
  if grep -q '/dictionaries/ita-eng.db' "$VERCEL_JSON"; then
    ok "ita-eng.db rewrite configured"
  else
    bad "missing rewrite for /dictionaries/ita-eng.db"
  fi
else
  bad "frontend/vercel.json missing"
fi

echo
echo "3. Frontend build"
if (cd "$FRONTEND" && npm run build --silent); then
  ok "npm run build"
  if [[ -f "$FRONTEND/build/dictionaries/catalog.json" ]]; then
    ok "build output includes dictionaries/catalog.json"
  else
    bad "build output missing dictionaries/catalog.json"
  fi
else
  bad "npm run build failed"
fi

echo
echo "4. Live checks ($BASE_URL)"
catalog_status="$(curl -sI "$BASE_URL/dictionaries/catalog.json" | awk 'NR==1{print $2}')"
if [[ "$catalog_status" == "200" ]]; then
  ok "GET /dictionaries/catalog.json → 200"
else
  bad "GET /dictionaries/catalog.json → ${catalog_status:-no response}"
fi

db_headers="$(curl -sI "$BASE_URL/dictionaries/ita-eng.db")"
db_status="$(echo "$db_headers" | awk 'NR==1{print $2}')"
db_length="$(echo "$db_headers" | awk 'tolower($1)=="content-length:"{print $2}' | tr -d '\r')"
db_type="$(echo "$db_headers" | awk 'tolower($1)=="content-type:"{print $2" "$3}' | tr -d '\r')"

if [[ "$db_status" == "200" && "$db_length" == "159973376" ]]; then
  ok "GET /dictionaries/ita-eng.db → 200, content-length 159973376"
elif [[ "$db_status" == "200" && "$db_type" == application/octet-stream* ]]; then
  note "ita-eng.db returns 200 but content-length is ${db_length:-unknown} (expected 159973376)"
elif [[ "$db_status" == "200" && "$db_type" == text/html* ]]; then
  bad "ita-eng.db returns HTML (rewrite to Blob not configured — fix frontend/vercel.json)"
else
  bad "GET /dictionaries/ita-eng.db → status ${db_status:-unknown}"
fi

home_status="$(curl -sI "$BASE_URL/" | awk 'NR==1{print $2}')"
if [[ "$home_status" == "200" ]]; then
  ok "GET / → 200"
else
  bad "GET / → ${home_status:-no response}"
fi

echo
echo "Summary: $pass passed, $fail failed, $warn warnings"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
