# Installation Guide

Panduan lengkap install + run semua 6 contoh di repo ini.

## 📋 Prasyarat Global

Semua contoh butuh:

| Tool | Versi Min | Cek | Install |
|---|---|---|---|
| **Node.js** | 20.x LTS | `node -v` | https://nodejs.org atau `nvm install 20` |
| **npm** | 10.x | `npm -v` | (included with Node) |
| **Wrangler** | 3.x | `npx wrangler --version` | `npm install -g wrangler` |
| **Git** | 2.x | `git --version` | https://git-scm.com |
| **jq** | 1.6 | `jq --version` | `sudo apt install jq` (opsional, untuk pretty-print) |
| **Python 3** | 3.11+ | `python3 --version` | https://python.org (untuk utility scripts) |
| **Akun Cloudflare** | - | https://dash.cloudflare.com/sign-up | Free tier OK |

---

## 🚀 Quick Install (Semua Sekaligus)

```bash
# 1. Clone repo
git clone https://github.com/Celebez/cf-deploy-tutorial.git
cd cf-deploy-tutorial

# 2. Install deps untuk semua example
for example in examples/0*/; do
  echo "📦 Installing $example..."
  (cd "$example" && npm install)
done
```

⏱️ Total waktu: ~3-5 menit (tergantung internet).

---

## 📦 Per Example (Detail)

### 01 — Static HTML Site

**Stack**: HTML + CSS + JS murni (NO build step)

```bash
cd examples/01-static-site

# Tidak ada npm install — pure HTML!
ls public/
# index.html  style.css  script.js

# Test lokal dengan Wrangler Pages dev
npx wrangler pages dev public

# → http://localhost:8788
```

**Dependencies**: Tidak ada. Deploy langsung.

---

### 02 — Next.js Static Export

**Stack**: Next.js 15 + React 19 + Tailwind CSS v4

```bash
cd examples/02-nextjs-static

# Install deps (~1-2 menit, 250MB)
npm install

# Dev mode (lihat perubahan live)
npm run dev
# → http://localhost:3000

# Build static export
npm run build
# Output: ./out/

# Preview hasil build
npx wrangler pages dev out
# → http://localhost:8788
```

**Dependencies** (otomatis via `npm install`):
- `next@^15`
- `react@^19`
- `react-dom@^19`
- `tailwindcss@^4`
- `@tailwindcss/postcss@^4`

**Wajib paham**:
- `next.config.ts` harus `output: "export"` + `images.unoptimized: true`
- Tailwind v4: konfigurasi via `@theme` di CSS, **bukan** `tailwind.config.ts`

---

### 03 — Worker REST API

**Stack**: TypeScript + itty-router + KV binding

```bash
cd examples/03-worker-api

# Install deps
npm install

# 1. Login ke Cloudflare
npx wrangler login
# Browser terbuka → Authorize

# 2. Buat KV namespace
npx wrangler kv namespace create CACHE
# Output:
# ✅ Created namespace CACHE
# id = "abc123def456..."

# 3. Buat preview namespace (untuk dev lokal)
npx wrangler kv namespace create CACHE --preview
# → id = "xyz789uvw012..."

# 4. Edit wrangler.toml — ganti placeholder dengan ID di atas:
#    id = "REPLACE_WITH_YOUR_KV_ID" → "abc123def456..."
#    preview_id = "REPLACE_WITH_YOUR_PREVIEW_KV_ID" → "xyz789uvw012..."

# 5. Test lokal
npx wrangler dev
# → http://localhost:8787
curl http://localhost:8787/ping
# {"ok":true,"edge":"local",...}

# 6. Deploy
npx wrangler deploy
# → https://cf-worker-api-demo.YOUR_SUBDOMAIN.workers.dev
```

**Dependencies** (otomatis):
- `itty-router@^5`
- `@cloudflare/workers-types` (dev)
- `typescript` (dev)
- `wrangler` (dev)

---

### 04 — Worker + D1 Auth

**Stack**: TypeScript + D1 SQLite + jose JWT + Turnstile

```bash
cd examples/04-worker-auth-d1

# Install deps
npm install

# 1. Login
npx wrangler login

# 2. Buat D1 database
npx wrangler d1 create cf-auth-demo-db
# Output:
# ✅ Created DB 'cf-auth-demo-db'
# database_id = "..."

# 3. Edit wrangler.toml — ganti REPLACE_WITH_YOUR_D1_ID

# 4. Apply schema (local + remote)
npx wrangler d1 execute cf-auth-demo-db --local --file=./schema.sql
npx wrangler d1 execute cf-auth-demo-db --remote --file=./schema.sql

# 5. Set JWT secret
echo "your-random-32-byte-secret-here" | npx wrangler secret put JWT_SECRET

# 6. (Optional) Set Turnstile secret
#    Buat widget dulu: https://dash.cloudflare.com → Turnstile → Add Widget
echo "0x4AAAAAAA..." | npx wrangler secret put TURNSTILE_SECRET

# 7. Test lokal
npx wrangler dev
# → http://localhost:8787

# 8. Deploy
npx wrangler deploy
```

**Dependencies**:
- `itty-router@^5`
- `jose@^5` (JWT signing/verification)
- `@cloudflare/workers-types` (dev)
- `typescript` (dev)
- `wrangler` (dev)

**Post-deploy — buat admin pertama**:
```bash
# Approve & promote akun pertama jadi admin
npx wrangler d1 execute cf-auth-demo-db --remote \
  --command="UPDATE users SET is_admin = 1, approved = 1 WHERE email = 'you@example.com'"
```

---

### 05 — Workers AI (Chat + Embeddings + Vision)

**Stack**: TypeScript + Workers AI binding

```bash
cd examples/05-workers-ai

# Install deps
npm install

# Login
npx wrangler login

# (Optional) Tambah KV cache untuk hemat neurons
# npx wrangler kv namespace create AI_CACHE
# Edit wrangler.toml: uncomment binding + ganti ID

# Test lokal
npx wrangler dev
# → http://localhost:8787

# Deploy
npx wrangler deploy
```

**Dependencies**:
- `@cloudflare/workers-types` (dev)
- `typescript` (dev)
- `wrangler` (dev)

**Models otomatis tersedia** (no setup):
- `@cf/meta/llama-3.2-3b-instruct` — chat
- `@cf/baai/bge-m3` — embeddings (multilingual)
- `@cf/unum/uform-gen2-qwen-500m` — vision

**Free tier**: 10k neurons/hari = ~30 chat turns dengan 3B model.

---

### 06 — All Bindings Zoo

**Stack**: TypeScript + D1 + KV + R2 + AI + Durable Objects

```bash
cd examples/06-all-bindings

# Install deps
npm install

# 1. Login
npx wrangler login

# 2. Buat semua resource
npx wrangler d1 create cf-zoo-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create cf-zoo-storage

# 3. Edit wrangler.toml — ganti semua ID placeholder:
#    - D1 database_id
#    - KV id + preview_id
#    - R2 bucket_name (sudah, tapi verify)

# 4. Apply schema
npx wrangler d1 execute cf-zoo-db --local --file=./schema.sql
npx wrangler d1 execute cf-zoo-db --remote --file=./schema.sql

# 5. Test lokal
npx wrangler dev
# → http://localhost:8787

# 6. Deploy
npx wrangler deploy
```

**Dependencies**:
- `itty-router@^5`
- `@cloudflare/workers-types` (dev)
- `typescript` (dev)
- `wrangler` (dev)

**Note**: Durable Objects butuh migration declaration di `wrangler.toml`. Sudah disertakan.

---

## 🛠️ Utility Scripts Install

Semua scripts di `scripts/` pakai Python stdlib (no install needed).

Tapi install opsional untuk jq (format JSON lebih cantik):

```bash
# Ubuntu/Debian
sudo apt install jq

# macOS
brew install jq

# Windows (Chocolatey)
choco install jq
```

---

## ✅ Post-Install Verification

Pastikan semuanya jalan:

```bash
# 1. Wrangler login
npx wrangler whoami
# Output: Account ID, email, type

# 2. Auth works
curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq .success
# → true

# 3. List Pages projects
npx wrangler pages project list

# 4. List Workers
npx wrangler deploy --dry-run --outdir=dist  # dry test
```

---

## 🆘 Troubleshooting

### `npm install` lambat / timeout
```bash
# Gunakan registry mirror
npm config set registry https://registry.npmmirror.com

# Atau pakai pnpm (lebih cepat)
npm install -g pnpm
pnpm install
```

### `wrangler: command not found`
```bash
# Pakai npx (tanpa global install)
npx wrangler --version

# Atau install global
npm install -g wrangler
```

### `Error: Authentication error [code: 10000]`
Token expired atau tidak valid:
```bash
# Cek token
curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"

# Buat token baru kalau perlu (lihat docs/en/02-account-setup/api-auth.md)
```

### `D1 database not found`
Database ID salah atau DB belum di-create:
```bash
# List semua D1
npx wrangler d1 list

# Bandingkan dengan wrangler.toml
```

### `KV namespace not bound`
Belum create KV atau ID salah:
```bash
# List KV namespaces
npx wrangler kv namespace list

# Update wrangler.toml dengan ID yang benar
```

### `Out of neurons` (Workers AI)
Free tier 10k neurons/hari habis:
- Tunggu 24 jam
- Pakai model lebih kecil (1B instead of 8B)
- Cache results di KV (lihat Example 05)

### `Build failed: Cannot find module`
`npm install` belum selesai atau ada error. Ulangi:
```bash
rm -rf node_modules package-lock.json
npm install
```

### `Module not found: itty-router` / `jose`
Salah directory. Pastikan di dalam `examples/0X-XXX/`:
```bash
pwd
# Harus menunjukkan path ke example folder
```

---

## 🌐 Deploy ke Production

Setelah test lokal sukses:

### Opsi A: Via GitHub (Recommended)

```bash
# 1. Push ke GitHub (kalau belum)
gh repo create cf-deploy-tutorial --public --source=. --push

# 2. Cloudflare Dashboard → Pages → "Connect to Git"
#    Pilih repo, set:
#    - Build command: npm run build (kalau Next.js)
#    - Build output: out (atau public untuk static)
#    - Root directory: examples/02-nextjs-static (kalau monorepo)

# 3. Set secrets di dashboard:
#    Settings → Environment variables → add:
#    - CLOUDFLARE_API_TOKEN
#    - CLOUDFLARE_ACCOUNT_ID
```

### Opsi B: Via Wrangler CLI

```bash
npx wrangler pages deploy ./out --project-name=YOUR_NAME --branch=main
npx wrangler deploy  # untuk Workers
```

### Opsi C: Via REST API (Script)

```bash
export CLOUDFLARE_API_TOKEN="cfut_..."
export CLOUDFLARE_ACCOUNT_ID="..."

# Pakai script Python yang sudah disertakan
python3 scripts/deploy_pages.py my-project ./out
```

---

## 📊 Resource Summary

| Example | Storage | Compute | AI |
|---|---|---|---|
| 01 Static | - | - | - |
| 02 Next.js | - | - | - |
| 03 API | KV | - | - |
| 04 Auth | D1 | - | - |
| 05 AI | (optional KV) | - | ✅ |
| 06 Zoo | D1+KV+R2 | Durable Object | ✅ |

Free tier total monthly cost: **$0** untuk traffic normal.

---

## 🔗 Link Penting

- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **Wrangler docs**: https://developers.cloudflare.com/workers/wrangler/
- **Workers docs**: https://developers.cloudflare.com/workers/
- **D1 docs**: https://developers.cloudflare.com/d1/
- **Workers AI docs**: https://developers.cloudflare.com/workers-ai/
- **Turnstile docs**: https://developers.cloudflare.com/turnstile/

---

## 🎯 Next Steps

Setelah semua jalan:
1. Customize example sesuai kebutuhan (ganti warna, tambah route, dll)
2. Baca [docs/en/11-deploy](../docs/en/11-deploy/README.md) untuk CI/CD
3. Setup custom domain: [docs/en/10-custom-domain](../docs/en/10-custom-domain/README.md)
4. Add Turnstile anti-bot: [docs/en/09-turnstile](../docs/en/09-turnstile/README.md)
5. Production checklist di [docs/en/11-deploy](../docs/en/11-deploy/README.md)

Happy deploying! 🚀
