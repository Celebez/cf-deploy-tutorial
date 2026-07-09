# 01 — Introduction & Architecture

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/01-introduction/README.md)

## What is Cloudflare Pages?

Cloudflare Pages is a **static site hosting + JAMstack platform** built on Cloudflare's global edge network (300+ cities). It serves your HTML/CSS/JS from every POP worldwide, with automatic SSL, CDN, and DDoS protection — **free tier available**.

## What are Cloudflare Workers?

Workers is a **serverless runtime** that executes JavaScript/TypeScript/WASM/Rust at the edge. Think of it as "AWS Lambda at the edge" but:
- **No cold start** (V8 isolates spin up in <5ms)
- **Pay per request**, not per second
- **Runs in 300+ locations** (Workers, not just origin)
- **100k req/day free**

## What are Bindings?

Bindings are how Workers access Cloudflare's data services **without HTTP overhead**:

| Binding | Type | Use Case |
|---|---|---|
| **D1** | SQL database (SQLite) | User data, transactions, relational |
| **KV** | Key-value store | Cache, config, sessions |
| **R2** | Object storage (S3-compat) | Files, images, backups |
| **Workers AI** | LLM inference | Text gen, embeddings, vision |
| **Vectorize** | Vector DB | RAG, semantic search |
| **Queues** | Message queue | Async jobs, fan-out |
| **Durable Objects** | Stateful instances | Real-time, coordination |
| **Analytics Engine** | Time-series DB | Metrics, logs, analytics |

## Architecture Pattern

```
┌──────────────────────────────────────────────────┐
│           Cloudflare Global Network              │
│                                                  │
│  User (Jakarta) ──► Edge POP ──► Cache hit?      │
│                                  │               │
│                       ┌──────────┴──────────┐    │
│                       ▼                     ▼    │
│                  [Pages]              [Workers]  │
│                  Static Site          API/SSR    │
│                                          │       │
│                       ┌──────────────────┤       │
│                       ▼          ▼     ▼ ▼       │
│                     [D1]      [KV]  [R2] [AI]    │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Pages vs Workers — When to use what?

| Use Case | Solution |
|---|---|
| Static HTML/JS site | **Pages** |
| Next.js blog (SSG) | **Pages** (with `output: 'export'`) |
| API endpoint | **Workers** |
| Auth + database | **Workers + D1** |
| Image upload | **Workers + R2** |
| LLM chat | **Workers + AI** |

## Pricing (Free Tier)

| Resource | Free Limit |
|---|---|
| Pages | Unlimited sites, 500 builds/month, 100GB bandwidth |
| Workers | 100,000 requests/day |
| D1 | 5GB storage, 5M reads/day, 100k writes/day |
| KV | 100,000 reads/day, 1,000 writes/day |
| R2 | 10GB storage, 10M reads/month, 1M writes/month |
| Workers AI | 10,000 neurons/day |

Enough for hobby projects, prototypes, small production apps.

## Next

→ [02. Cloudflare Account Setup](../02-account-setup/README.md)
