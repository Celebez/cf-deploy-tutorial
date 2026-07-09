# Example 06 — All Bindings Zoo

> Demo semua 5 bindings sekaligus: D1 + KV + R2 + AI + Durable Objects. Lihat [docs/en/08](../../docs/en/08-bindings/README.md) | 🇮🇩 [docs/id/08](../../docs/id/08-bindings/README.md)

## Architecture

```
HTTP Request
    │
    ▼
┌─────────────┐
│   Worker    │
└─────────────┘
    │
    ├──► D1 (relational data: notes metadata)
    ├──► KV (session cache, rate limit)
    ├──► R2 (file attachments)
    ├──► AI (auto-summarize text)
    └──► Durable Objects (per-user counter)
```

## Setup

```bash
cd examples/06-all-bindings
npm install

# Create resources
npx wrangler d1 create cf-zoo-db
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create cf-zoo-storage

# Copy IDs to wrangler.toml
# Then:
npx wrangler d1 execute cf-zoo-db --local --file=./schema.sql
npx wrangler d1 execute cf-zoo-db --remote --file=./schema.sql

npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Routes

| Method | Path | Bindings Used | Deskripsi |
|---|---|---|---|
| POST | `/notes` | D1 + AI | Create note + auto-summarize |
| GET | `/notes` | D1 | List notes |
| GET | `/notes/:id` | D1 + KV cache | Get note (cached in KV) |
| POST | `/upload` | R2 | Upload file (metadata in D1) |
| GET | `/files/:id` | R2 + D1 | Download file |
| POST | `/counter/increment` | Durable Objects | Increment per-user counter |
| GET | `/counter/:userId` | Durable Objects | Get counter value |

## Test Flow

```bash
# 1. Create note (uses AI to summarize)
curl -X POST http://localhost:8787/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Cloudflare Workers run JavaScript at the edge. Fast."}'

# 2. Upload file to R2
echo "hello world" > /tmp/test.txt
curl -X POST http://localhost:8787/upload \
  -F "file=@/tmp/test.txt"

# 3. Increment counter (Durable Object)
curl -X POST http://localhost:8787/counter/increment
curl http://localhost:8787/counter/user-123
```
