# 08 — Bindings: KV, R2, Queues, Durable Objects

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/08-bindings/README.md)

Bindings memungkinkan Workers mengakses layanan data Cloudflare **tanpa overhead HTTP**.

## KV — Key-Value Store

### Buat

```bash
npx wrangler kv namespace create CACHE
# → id = "abc123..."
npx wrangler kv namespace create CACHE --preview  # untuk local dev
```

### `wrangler.toml`

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."
preview_id = "def456..."
```

### Pemakaian

```typescript
export interface Env {
  CACHE: KVNamespace;
}

// Write (dengan TTL opsional dalam detik)
await env.CACHE.put('user:123', JSON.stringify({ name: 'Alice' }), {
  expirationTtl: 3600,
});

// Read
const user = await env.CACHE.get('user:123', 'json');

// Delete
await env.CACHE.delete('user:123');

// List (dengan prefix)
const list = await env.CACHE.list({ prefix: 'user:' });
for (const key of list.keys) console.log(key.name);
```

### Operasi CLI

```bash
# Bulk upload dari JSON
npx wrangler kv bulk put --namespace-id=abc123 --file=./data.json
# {"key1": "value1", "key2": "value2"}

# Get single
npx wrangler kv get --namespace-id=abc123 user:123

# Delete
npx wrangler kv delete --namespace-id=abc123 user:123
```

**Use case**: config, session cache, rate limiting, feature flag.

## R2 — Object Storage (S3-Compatible)

### Buat Bucket

```bash
npx wrangler r2 bucket create my-bucket
```

### `wrangler.toml`

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"
```

### Pemakaian

```typescript
export interface Env {
  STORAGE: R2Bucket;
}

// Upload
await env.STORAGE.put('avatars/user-123.png', imageBuffer, {
  httpMetadata: { contentType: 'image/png' },
});

// Read
const obj = await env.STORAGE.get('avatars/user-123.png');
if (obj) {
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'ETag': obj.httpEtag,
    },
  });
}

// List
const list = await env.STORAGE.list({ prefix: 'avatars/' });

// Delete
await env.STORAGE.delete('avatars/user-123.png');

// Presigned URL (untuk direct browser upload)
// Catatan: R2 belum punya native presigned URL; pakai Worker endpoint
```

**Use case**: upload user, backup, file besar, image CDN.

## Queues — Async Message Queue

### Buat

```bash
npx wrangler queues create my-queue
```

### `wrangler.toml`

```toml
[[queues.producers]]
binding = "QUEUE"
queue = "my-queue"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
```

### Producer

```typescript
export interface Env {
  QUEUE: Queue;
}

await env.QUEUE.send({
  type: 'send-email',
  to: 'user@example.com',
  subject: 'Selamat Datang',
});
```

### Consumer

```typescript
export default {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      console.log('Processing:', msg.body);
      // do work
      msg.ack();  // optional - auto-acked on success
    }
  },
};
```

**Use case**: kirim email, proses gambar, webhook, fan-out.

## Durable Objects — Stateful Edge

Untuk saat kamu butuh **state strongly consistent** di edge (counter, lock, WebSocket room).

### `wrangler.toml`

```toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

### Implementasi

```typescript
export class Counter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/increment') {
      let count = (await this.state.storage.get<number>('count')) ?? 0;
      count++;
      await this.state.storage.put('count', count);
      return Response.json({ count });
    }

    if (url.pathname === '/get') {
      const count = (await this.state.storage.get<number>('count')) ?? 0;
      return Response.json({ count });
    }

    return new Response('Not found', { status: 404 });
  }
}

export { Counter };

// Worker entry
export interface Env {
  COUNTER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.COUNTER.idFromName('global');
    const stub = env.COUNTER.get(id);
    return stub.fetch(request);
  },
};
```

**Use case**: rate limiter, WebSocket server, multiplayer state, leaderboard.

## Tabel Perbandingan

| Binding | Konsistensi | Kecepatan | Model Biaya | Terbaik Untuk |
|---|---|---|---|---|
| D1 | Strong | ~10ms | per row read/write | Data relasional |
| KV | Eventual (~60s) | <5ms | per read/write | Cache, config |
| R2 | Strong (per object) | ~50ms | per GB stored | File, blob |
| Queues | At-least-once | async | per message | Async job |
| Durable Objects | Strong | ~5ms | per request + storage | Stateful edge |

Lihat [`examples/06-all-bindings/`](../../../examples/06-all-bindings/) untuk demo lengkap 5 binding.

## Lanjut

→ [09. Turnstile: Anti-Bot](../09-turnstile/README.md)
