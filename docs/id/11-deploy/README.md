# 11 — Deploy via Wrangler & API

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/11-deploy/README.md)

Dua jalur deploy: **Wrangler CLI** (sederhana) dan **REST API** (bisa di-script, CI-friendly).

## Jalur A: Wrangler CLI

### Install

```bash
npm install -D wrangler
```

### Login

```bash
npx wrangler login
```

Atau set token di env:
```bash
export CLOUDFLARE_API_TOKEN="cfut_..."
```

### Deploy Pages (Static)

```bash
npx wrangler pages deploy ./public --project-name=my-site --branch=main
```

Flags:
- `--commit-dirty=true` — bypass warning git saat dev
- `--branch` — default `main`
- `--project-name` — harus ada (buat dulu atau pakai integrasi git)

### Deploy Workers

```bash
npx wrangler deploy
```

Baca `wrangler.toml` untuk config.

### Perintah Wrangler yang Umum

```bash
# List project
npx wrangler pages project list

# Info project
npx wrangler pages project get my-site

# Tail log (live)
npx wrangler tail my-worker

# Secret
npx wrangler secret put MY_SECRET    # interaktif
echo "value" | npx wrangler secret put MY_SECRET  # via pipe
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

# Tail (log live dari Worker production)
npx wrangler tail my-worker --format=pretty
```

## Jalur B: REST API

Untuk CI/CD atau saat auth Wrangler ribet.

### Deploy Pages via API

Buat `deploy_pages.py`:

```python
"""Deploy sebuah directory ke Cloudflare Pages via REST API."""
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
            # Key manifest harus pakai forward slash
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
            print(f"✅ Deploy sukses: {result['result'].get('url')}")
        else:
            print(f"❌ Gagal: {result.get('errors')}")
            sys.exit(1)

if __name__ == '__main__':
    deploy(DIRECTORY, PROJECT)
```

Pemakaian:
```bash
python3 deploy_pages.py my-site ./public
```

⚠️ **Pitfall**: Semua file HARUS dalam SATU request. Upload terpisah bikin deployment rusak.

### Deploy Worker Script

```python
import urllib.request, json, os

ACCOUNT_ID = os.environ['CLOUDFLARE_ACCOUNT_ID']
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']

# Upload script Worker
script_content = open('src/index.ts').read()  # Atau compiled JS

# Catatan: Workers API butuh plain JS atau wasm, bukan TS
# Pakai wrangler untuk build dulu, lalu upload dist
```

**Rekomendasi**: Pakai Wrangler untuk Workers (butuh compile TS). Pakai API hanya untuk Pages.

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

Set secret di GitHub: Settings → Secrets → Actions → `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Local Dev Loop

```bash
# Terminal 1: Worker
cd my-api && npx wrangler dev

# Terminal 2: Pages
cd my-site && npx wrangler pages dev public --proxy= http://localhost:8787
# Sekarang request /api/* proxy ke Worker kamu
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

## Checklist Pre-Deploy

- [ ] Tidak ada secret di `wrangler.toml` (pakai `wrangler secret put`)
- [ ] Semua binding punya ID yang benar (`kv_namespaces`, `d1_databases`)
- [ ] `compatibility_date` adalah tanggal hari ini
- [ ] `.dev.vars` untuk secret lokal (di-gitignore)
- [ ] Artifact build fresh (`rm -rf out/ dist/ .next/`)
- [ ] Test dengan `wrangler dev` dulu

## Lanjut

🎉 Selesai! Eksplor [`examples/`](../../../examples/) untuk project runnable lengkap.
