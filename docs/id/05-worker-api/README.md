# 05 — Workers: API Server

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/05-worker-api/README.md)

Cloudflare Workers menjalankan JavaScript/TypeScript di edge. Pakai untuk REST API, webhook, atau logic backend apapun.

## Setup

```bash
mkdir my-api && cd my-api
npm init -y
npm install -D wrangler typescript @cloudflare/workers-types
npx wrangler init --type javascript  # atau "typescript"
```

## `wrangler.toml` (Wajib)

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2025-01-01"

# Bindings (optional, lihat section lain)
# [[kv_namespaces]]
# binding = "CACHE"
# id = "your-kv-id"

# [[d1_databases]]
# binding = "DB"
# database_name = "my-db"
# database_id = "your-d1-id"
```

## `src/index.ts` — Hello World API

```typescript
export interface Env {
  CACHE?: KVNamespace;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') return json(null, 204);

    // Routes
    if (url.pathname === '/ping') {
      return json({
        ok: true,
        edge: request.cf?.colo ?? 'unknown',
        country: request.cf?.country ?? 'unknown',
        timestamp: Date.now(),
      });
    }

    if (url.pathname === '/echo' && request.method === 'POST') {
      const body = await request.json();
      return json({ received: body });
    }

    if (url.pathname === '/cache-demo') {
      // Pemakaian binding KV (jika dikonfigurasi)
      if (!env.CACHE) return json({ error: 'KV tidak ter-binding' }, 500);
      const cached = await env.CACHE.get('demo');
      if (cached) return json({ source: 'kv-cache', value: cached });

      const fresh = { counter: Math.random(), t: Date.now() };
      await env.CACHE.put('demo', JSON.stringify(fresh), { expirationTtl: 60 });
      return json({ source: 'origin', value: fresh });
    }

    return json({ error: 'Not Found' }, 404);
  },
};
```

## Local Dev

```bash
npx wrangler dev
# → http://localhost:8787
curl http://localhost:8787/ping
# {"ok":true,"edge":"local","country":null,"timestamp":...}
```

## Deploy

```bash
npx wrangler deploy
# → https://my-api.your-subdomain.workers.dev
```

## Secrets

Untuk API key, pakai `wrangler secret` (jangan ditaruh di `wrangler.toml`):

```bash
echo "sk_live_xxxxx" | npx wrangler secret put STRIPE_KEY
```

Di kode:
```typescript
const stripeKey = env.STRIPE_KEY; // Tersedia saat runtime
```

## Pitfall yang Umum

❌ **`import` statements** — Workers support ES modules, tapi butuh `"type": "module"` di `package.json` ATAU extension `.mjs`.
❌ **Node.js APIs** — `fs`, `path`, `Buffer` sebagian tersedia via flag `nodejs_compat` (set di `wrangler.toml`).
✅ **Pakai `crypto.subtle`** untuk hashing — built-in.
✅ **Pakai `crypto.randomUUID()`** untuk ID.

## Pola Router (Multi-route)

Untuk API lebih besar, pakai router:

```typescript
import { Router } from 'itty-router';  # npm i itty-router
const router = Router();

router.get('/users/:id', async ({ params }) => {
  return json({ id: params.id });
});

router.post('/users', async (request) => {
  const data = await request.json();
  return json({ created: data }, 201);
});

export default {
  fetch: router.handle,
};
```

Lihat [`examples/03-worker-api/`](../../../examples/03-worker-api/) untuk CRUD lengkap.

## Lanjut

→ [06. Workers + D1: Auth Database](../06-worker-d1/README.md)
