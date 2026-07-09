# Example 03 — Worker REST API

> REST API di Cloudflare Workers. Lihat [docs/en/05](../../docs/en/05-worker-api/README.md) | 🇮🇩 [docs/id/05](../../docs/id/05-worker-api/README.md)

## Setup

```bash
cd examples/03-worker-api
npm install
npx wrangler kv namespace create CACHE
# Copy ID ke wrangler.toml
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Routes

| Method | Path | Deskripsi |
|---|---|---|
| GET | `/ping` | Health check + edge info |
| GET | `/users` | List users (paginated) |
| POST | `/users` | Create user |
| GET | `/users/:id` | Get one user |
| DELETE | `/users/:id` | Delete user |
| GET | `/cache-demo` | KV cache demo |

## Test

```bash
curl https://my-api.workers.dev/ping
# {"ok":true,"edge":"SIN","country":"SG","timestamp":...}

curl -X POST https://my-api.workers.dev/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

curl https://my-api.workers.dev/cache-demo
# First call: {"source":"origin","value":{...}}
# Second call: {"source":"kv-cache","value":{...}}
```

## Data Storage

Contoh ini pakai **KV namespace** untuk menyimpan users. Untuk relational data, lihat Example 04 (D1).
