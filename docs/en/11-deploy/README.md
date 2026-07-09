# 11 — Deploy via Wrangler & API

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/11-deploy/README.md)

Two deployment paths: **Wrangler CLI** (simple) and **REST API** (scriptable, CI-friendly).

## Path A: Wrangler CLI

### Install

```bash
npm install -D wrangler
```

### Login

```bash
npx wrangler login
```

Or set token in env:
```bash
export CLOUDFLARE_API_TOKEN="cfut_..."
```

### Deploy Pages (Static)

```bash
npx wrangler pages deploy ./public --project-name=my-site --branch=main
```

Flags:
- `--commit-dirty=true` — bypass git warning during dev
- `--branch` — default `main`
- `--project-name` — must exist (create first or use git integration)

### Deploy Workers

```bash
npx wrangler deploy
```

Reads `wrangler.toml` for config.

### Common Wrangler Commands

```bash
# List projects
npx wrangler pages project list

# Project info
npx wrangler pages project get my-site

# Tail logs (live)
npx wrangler tail my-worker

# Secrets
npx wrangler secret put MY_SECRET    # interactive
echo "value" | npx wrangler secret put MY_SECRET  # piped
npx wrangler secret list
npx wrangler secret delete MY_SECRET

# D1
npx wrangler d1 create my-db
npx wrangler d1 execute my-db --remote --command="SELECT 1"
npx wrangler d1 execute my-db --remote --file=./schema.sql
npx wrangler d1 export my-db --remote --output=./backup.sql

# KV
npx wrangler kv namespace create CACHE
npx wrangler kv key put --namespace-id=xxx my-key my-value
npx wrangler kv key get --namespace-id=xxx my-key

# R2
npx wrangler r2 bucket create my-bucket
npx wrangler r2 object put my-bucket/file.txt --file=./local.txt

# Tail (live logs from production Worker)
npx wrangler tail my-worker --format=pretty
```

## Path B: REST API

For CI/CD or when Wrangler auth is tricky.

### Deploy Pages via API

Create `deploy_pages.py`:

```python
"""Deploy a directory to Cloudflare Pages via REST API."""
import os
import sys
import json
import urllib.request
from pathlib import Path

ACCOUNT_ID = os.environ['CLOUDFLARE_ACCOUNT_ID']
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']
PROJECT = sys.argv[1]
DIRECTORY = sys.argv[2]

def deploy(directory: str, project: str):
    base = Path(directory)
    files = {}

    for path in base.rglob('*'):
        if path.is_file():
            rel = str(path.relative_to(base))
            # Manifest keys must use forward slashes
            files[rel] = str(path)

    manifest = json.dumps({"files": {k: {"contentType": "application/octet-stream"} for k in files.keys()}})

    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/pages/projects/{project}/deployments"

    # Build multipart form
    boundary = '----formboundary123abc'
    body = []
    body.append(f'--{boundary}'.encode())
    body.append(f'Content-Disposition: form-data; name="manifest"'.encode())
    body.append(b''.encode())
    body.append(manifest.encode())

    for rel, abs_path in files.items():
        body.append(f'--{boundary}'.encode())
        body.append(f'Content-Disposition: form-data; name="file"; filename="{rel}"'.encode())
        body.append(b''.encode())
        body.append(Path(abs_path).read_bytes())

    body.append(f'--{boundary}--'.encode())
    body.append(b''.encode())

    payload = b'\r\n'.join(body)

    req = urllib.request.Request(url, data=payload, method='POST', headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type': f'multipart/form-data; boundary={boundary}',
    })

    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        if result.get('success'):
            print(f"✅ Deployed: {result['result'].get('url')}")
        else:
            print(f"❌ Failed: {result.get('errors')}")
            sys.exit(1)

if __name__ == '__main__':
    deploy(DIRECTORY, PROJECT)
```

Usage:
```bash
python3 deploy_pages.py my-site ./public
```

⚠️ **Pitfall**: All files MUST be in ONE request. Uploading separately creates broken deployments.

### Deploy Worker Script

```python
import urllib.request, json, os

ACCOUNT_ID = os.environ['CLOUDFLARE_ACCOUNT_ID']
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']

# Upload a Worker script
script_content = open('src/index.ts').read()  # Or compiled JS

# Note: Workers API requires plain JS or wasm, not TS
# Use wrangler to build first, then upload dist
```

**Recommendation**: Use Wrangler for Workers (TS compile step needed). Use API for Pages only.

## GitHub Actions Auto-Deploy

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: my-site
          directory: out
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

Set secrets in GitHub: Settings → Secrets → Actions → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Local Dev Loop

```bash
# Terminal 1: Worker
cd my-api && npx wrangler dev

# Terminal 2: Pages
cd my-site && npx wrangler pages dev public --proxy= http://localhost:8787
# Now /api/* requests proxy to your Worker
```

## Debugging

```bash
# Live tail
npx wrangler tail my-worker

# Filter by status
npx wrangler tail my-worker --status=error

# Format
npx wrangler tail my-worker --format=json
```

## Pre-Deploy Checklist

- [ ] No secrets in `wrangler.toml` (use `wrangler secret put`)
- [ ] All bindings have correct IDs (`kv_namespaces`, `d1_databases`)
- [ ] `compatibility_date` is current (set to today)
- [ ] `.dev.vars` for local secrets (gitignored)
- [ ] Build artifacts fresh (`rm -rf out/ dist/ .next/`)
- [ ] Test with `wrangler dev` first

## Next

🎉 You're done! Explore [`examples/`](../../../examples/) for full working projects.
