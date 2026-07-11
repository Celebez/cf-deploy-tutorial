#!/usr/bin/env bash
# Create Cloudflare API Token via REST API.
# Usage: CF_EMAIL=you@x.com CF_KEY=cfk_xxx ACCOUNT_ID=xxx bash scripts/create_token.sh
#
# NOTE: pass CF_KEY via ENVIRONMENT (not argv) so it never appears in `ps`/history.
# Get global API key: https://dash.cloudflare.com/profile/api-tokens
# Get account ID: wrangler whoami

set -euo pipefail

EMAIL="${CF_EMAIL:-}"
GLOBAL_KEY="${CF_KEY:-}"
ACCOUNT_ID="${ACCOUNT_ID:-}"

if [[ -z "$GLOBAL_KEY" || -z "$EMAIL" || -z "$ACCOUNT_ID" ]]; then
  echo "Usage: CF_EMAIL=you@x.com CF_KEY=cfk_xxx ACCOUNT_ID=xxx $0" >&2
  echo ""
  echo "Get global API key:  https://dash.cloudflare.com/profile/api-tokens"
  echo "Get account ID:       wrangler whoami"
  exit 1
fi

echo "🔑 Creating Pages Deploy Token..."

RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "X-Auth-Email: $EMAIL" \
  -H "X-Auth-Key: $GLOBAL_KEY" \
  -H "Content-Type: application/json" \
  --data "{
    \"name\": \"Pages Deploy Token\",
    \"policies\": [{
      \"effect\": \"allow\",
      \"resources\": {\"com.cloudflare.api.account.${ACCOUNT_ID}\": \"*\"},
      \"permission_groups\": [
        {\"id\": \"8d28297797f24fb8a0c332fe0866ec89\"},
        {\"id\": \"e247aedd66bd41cc9193af0213416666\"},
        {\"id\": \"968749a9f34041cf88ad0e29c86e6f96\"}
      ]
    }]
  }")

echo "$RESPONSE" | python3 -m json.tool

TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['result']['value'] if d.get('success') else 'ERROR')")

if [[ "$TOKEN" != "ERROR" ]]; then
  echo ""
  echo "✅ Token created. Save it now:"
  echo ""
  echo "   export CLOUDFLARE_API_TOKEN=\"$TOKEN\""
  echo ""
fi
