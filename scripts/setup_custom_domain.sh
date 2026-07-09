#!/usr/bin/env bash
# Setup Cloudflare custom domain for a Pages project.
# Deletes conflicting A/AAAA records first, then creates CNAME.
#
# Usage: CF_EMAIL=you@x.com CF_KEY=cfk_xxx ZONE_ID=xxx PROJECT=my-site DOMAIN=example.com bash scripts/setup_custom_domain.sh

set -euo pipefail

: "${CF_EMAIL:?Set CF_EMAIL}"
: "${CF_KEY:?Set CF_KEY (Global API Key)}"
: "${ZONE_ID:?Set ZONE_ID}"
: "${PROJECT:?Set PROJECT (Pages project name)}"
: "${DOMAIN:?Set DOMAIN (e.g., example.com)}"

API="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"
HEADERS=(-H "X-Auth-Email: ${CF_EMAIL}" -H "X-Auth-Key: ${CF_KEY}" -H "Content-Type: application/json")

echo "🔍 Checking existing DNS records for ${DOMAIN}..."

# 1. Delete conflicting A/AAAA records
EXISTING=$(curl -s "${API}?name=${DOMAIN}&type=A,AAAA" "${HEADERS[@]}")
COUNT=$(echo "$EXISTING" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('result', [])))")

if [[ "$COUNT" -gt 0 ]]; then
  echo "🗑️  Deleting $COUNT conflicting A/AAAA record(s)..."
  echo "$EXISTING" | python3 -c "
import sys, json, urllib.request
records = json.load(sys.stdin).get('result', [])
for r in records:
    url = f'https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/{r[\"id\"]}'
    req = urllib.request.Request(url, method='DELETE', headers={
        'X-Auth-Email': '${CF_EMAIL}',
        'X-Auth-Key': '${CF_KEY}'
    })
    urllib.request.urlopen(req)
    print(f'  Deleted {r[\"type\"]} {r[\"name\"]}')
"
fi

# 2. Create CNAME for apex
echo "📡 Creating CNAME for ${DOMAIN}..."
curl -s -X POST "${API}" "${HEADERS[@]}" --data "{
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
