#!/usr/bin/env bash
# Setup Cloudflare custom domain for a Pages project.
# Deletes conflicting A/AAAA records first, then creates CNAME.
#
# Prefers a scoped API Token (CLOUDFLARE_API_TOKEN) when set; falls back to a
# Global API Key (CF_EMAIL + CF_KEY) only if no token is provided.
#   API Token (preferred):  export CLOUDFLARE_API_TOKEN="cfut_..."
#   Global Key (legacy):    CF_EMAIL=you@x.com CF_KEY=cfk_xxx
#   Required for both:      ZONE_ID=xxx PROJECT=my-site DOMAIN=example.com

set -euo pipefail

ZONE_ID="${ZONE_ID:?Set ZONE_ID}"
PROJECT="${PROJECT:?Set PROJECT (Pages project name)}"
DOMAIN="${DOMAIN:?Set DOMAIN (e.g., example.com)}"

# Build auth headers: token preferred, global key fallback.
if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")
  echo "🔑 Using scoped API Token for auth."
elif [[ -n "${CF_EMAIL:-}" && -n "${CF_KEY:-}" ]]; then
  AUTH_HEADER=(-H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_KEY}")
  echo "⚠️  Using Global API Key (legacy). Prefer CLOUDFLARE_API_TOKEN for safety."
else
  echo "❌ Set CLOUDFLARE_API_TOKEN, or CF_EMAIL + CF_KEY" >&2
  exit 1
fi

API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"

echo "🔍 Checking existing DNS records for ${DOMAIN}..."

# 1. Delete conflicting A/AAAA records
EXISTING=$(curl -s "${API}?name=${DOMAIN}&type=A,AAAA" "${AUTH_HEADER[@]}")
COUNT=$(echo "$EXISTING" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result', [])))")

if [[ "$COUNT" -gt 0 ]]; then
  echo "🗑️  Deleting $COUNT conflicting A/AAAA record(s)..."
  echo "$EXISTING" | python3 -c "
import sys, json, urllib.request
records = json.load(sys.stdin).get('result', [])
for r in records:
    url = f'https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/{r[\"id\"]}'
    req = urllib.request.Request(url, method='DELETE', headers={
        'Authorization': 'Bearer ${CLOUDFLARE_API_TOKEN:-}',
        'X-Auth-Email': '${CF_EMAIL:-}',
        'X-Auth-Key': '${CF_KEY:-}'
    })
    urllib.request.urlopen(req)
    print(f'  Deleted {r[\"type\"]} {r[\"name\"]}')
"
fi

# 2. Create CNAME for apex
echo "📡 Creating CNAME for ${DOMAIN}..."
curl -s -X POST "${API}" "${AUTH_HEADER[@]}" --data "{
  \"type\": \"CNAME\",
  \"name\": \"@\",
  \"content\": \"${PROJECT}.pages.dev\",
  \"proxied\": true
}" | python3 -c "
import sys, json
r = json.load(sys.stdin)
if r.get('success'):
    print(f'  ✅ CNAME created: {r[\"result\"][\"name\"]} → {r[\"result\"][\"content\"]}')
else:
    print(f'  ❌ Error: {r.get(\"errors\")}')
    sys.exit(1)
"

# 3. Add domain to Pages project
echo "🔗 Adding ${DOMAIN} to Pages project ${PROJECT}..."
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-}"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"
if [[ -z "$ACCOUNT_ID" || -z "$TOKEN" ]]; then
  echo "⚠️  Skipping Pages domain attachment (set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN)"
else
  curl -s -X POST \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT}/domains" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"name\": \"${DOMAIN}\"}" | python3 -c "
import sys, json
r = json.load(sys.stdin)
if r.get('success'):
    print(f'  ✅ Domain attached: {r[\"result\"][\"name\"]}')
    print(f'     Status will progress: initializing → pending → active')
    print(f'     SSL issued by Google Trust Services in ~2 minutes')
else:
    print(f'  ❌ Error: {r.get(\"errors\")}')
"
fi

echo ""
echo "✅ Done. Verify with:"
echo "   dig @1.1.1.1 ${DOMAIN} A +short"
echo "   curl -I https://${DOMAIN}"
