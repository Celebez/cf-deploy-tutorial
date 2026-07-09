# 08 — Bindings: KV, R2, Queues, Durable Objects

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/08-bindings/README.md)

Bindings let Workers access Cloudflare data services **without HTTP overhead**.

## KV — Key-Value Store

### Create

```bash
npx wrangler kv namespace create CACHE
# → id = "abc123..."
npx wrangler kv namespace create CACHE --preview  # for local dev
```

### `wrangler.toml`

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "abc123..."
preview_id = "def456..."
```

### Usage

```typescript
export interface Env {
  CACHE: KVNamespace;
}

// Write (with optional TTL in seconds)
await env.CACHE.put('user:123', JSON.stringify({ name: 'Alice' }), {
  expirationTtl: 3600,
});

// Read
const user = await env.CACHE.get('user:123', 'json');

// Delete
await env.CACHE.delete('user:123');

// List (with prefix)
const list = await env.CACHE.list({ prefix: 'user:' });
for (const key of list.keys) console.log(key.name);
```

### CLI Operations

```bash
# Bulk upload from JSON
npx wrangler kv bulk put --namespace-id=abc123 --file=./data.json
# {"key1": "value1", "key2": "value2"}

# Get single
npx wrangler kv get --namespace-id=abc123 user:123

# Delete
npx wrangler kv delete --namespace-id=abc123 user:123
```

**Use cases**: config, session cache, rate limiting, feature flags.

## R2 — Object Storage (S3-Compatible)

### Create Bucket

```bash
npx wrangler r2 bucket create my-bucket
```

### `wrangler.toml`

```toml
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"
```

### Usage

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

// Presigned URL (for direct browser upload)
// Note: R2 doesn't have native presigned URLs yet; use Worker endpoint
```

**Use cases**: user uploads, backups, large files, image CDN.

## Queues — Async Message Queue

### Create

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
  subject: 'Welcome',
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

**Use cases**: email sending, image processing, webhooks, fan-out.

## Durable Objects — Stateful Edge

For when you need **strongly consistent state** at the edge (counters, locks, WebSocket rooms).

### `wrangler.toml`

```toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

### Implementation

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

**Use cases**: rate limiters, WebSocket servers, multiplayer state, leaderboards.

## Comparison Table

| Binding | Consistency | Speed | Cost Model | Best For |
|---|---|---|---|---|
| D1 | Strong | ~10ms | per row read/write | Relational data |
| KV | Eventual (~60s) | <5ms | per read/write | Cache, config |
| R2 | Strong (per object) | ~50ms | per GB stored | Files, blobs |
| Queues | At-least-once | async | per message | Async jobs |
| Durable Objects | Strong | ~5ms | per request + storage | Stateful edge |

See [`examples/06-all-bindings/`](../../../examples/06-all-bindings/) for a full demo with all 5.

## Next

→ [09. Turnstile: Anti-Bot Protection](../09-turnstile/README.md)
