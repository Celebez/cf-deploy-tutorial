# Quick Reference Cheatsheet

## Wrangler CLI

```bash
# Login
npx wrangler login

# Pages
npx wrangler pages deploy <dir> --project-name=<name> --branch=main
npx wrangler pages dev <dir>
npx wrangler pages project list
npx wrangler pages project get <name>

# Workers
npx wrangler deploy
npx wrangler dev
npx wrangler tail <name>

# Secrets
npx wrangler secret put <NAME>      # interactive
npx wrangler secret list
npx wrangler secret delete <NAME>

# D1
npx wrangler d1 create <name>
npx wrangler d1 execute <name> --local --file=./schema.sql
npx wrangler d1 execute <name> --remote --file=./schema.sql
npx wrangler d1 export <name> --remote --output=./backup.sql

# KV
npx wrangler kv namespace create <name>
npx wrangler kv bulk put --namespace-id=<id> --file=./data.json

# R2
npx wrangler r2 bucket create <name>
npx wrangler r2 object put <bucket>/<key> --file=./local

# Queues
npx wrangler queues create <name>
```

## curl API Templates

### Create API Token
```bash
curl -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "X-Auth-Email: $EMAIL" -H "X-Auth-Key: $KEY" \
  -H "Content-Type: application/json" \
  --data '{"name":"Deploy","policies":[{"effect":"allow","resources":{"com.cloudflare.api.account.<ACC>":"*"},"permission_groups":[{"id":"8d28297797f24fb8a0c332fe0866ec89"}]}]}'
```

### Pages Deploy
```bash
# Use scripts/deploy_pages.py (handles multipart properly)
python3 scripts/deploy_pages.py <project> <dir>
```

### Add Custom Domain
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACC/pages/projects/$PROJ/domains" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data '{"name":"example.com"}'
```

### Turnstile Widget
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACC/challenges/widgets" \
  -H "X-Auth-Email: $EMAIL" -H "X-Auth-Key: $KEY" \
  -H "Content-Type: application/json" \
  --data '{"name":"my-auth","domains":["example.com"],"mode":"managed"}'
```

## Common Env Vars

```bash
export CLOUDFLARE_API_TOKEN="cfut_..."        # API Token (preferred)
export CLOUDFLARE_ACCOUNT_ID="..."             # Account UUID
export CF_EMAIL="you@email.com"                # For Global API Key calls
export CF_KEY="cfk_..."                        # Global API Key (legacy)
```

## Permission Group IDs

| ID | Permission |
|---|---|
| `8d28297797f24fb8a0c332fe0866ec89` | Pages Write |
| `e247aedd66bd41cc9193af0216666`     | Pages Read |
| `968749a9f34041cf88ad0e29c86e6f96`   | Pages Metadata Read |

## Compatibility Flags

Set di `wrangler.toml`:
```toml
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]  # untuk Node.js APIs
```

## Free Tier Limits

| Service | Limit |
|---|---|
| Pages builds | 500/month |
| Workers | 100k requests/day |
| D1 | 5GB, 5M reads/day, 100k writes/day |
| KV | 100k reads/day, 1k writes/day |
| R2 | 10GB storage, 10M reads/month |
| Workers AI | 10k neurons/day |
