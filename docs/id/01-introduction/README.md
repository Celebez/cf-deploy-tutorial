# 01 — Pengenalan & Arsitektur

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/01-introduction/README.md)

## Apa itu Cloudflare Pages?

Cloudflare Pages adalah **platform hosting static site + JAMstack** yang berjalan di jaringan edge global Cloudflare (300+ kota). File HTML/CSS/JS kamu dilayani dari setiap POP di seluruh dunia, dengan SSL otomatis, CDN, dan perlindungan DDoS — **ada free tier**.

## Apa itu Cloudflare Workers?

Workers adalah **runtime serverless** yang mengeksekusi JavaScript/TypeScript/WASM/Rust di edge. Bayangkan "AWS Lambda di edge" tapi:
- **Tanpa cold start** (V8 isolates spin up dalam <5ms)
- **Bayar per request**, bukan per detik
- **Berjalan di 300+ lokasi** (Workers, bukan cuma origin)
- **100k request/hari gratis**

## Apa itu Bindings?

Bindings adalah cara Workers mengakses layanan data Cloudflare **tanpa overhead HTTP**:

| Binding | Tipe | Use Case |
|---|---|---|
| **D1** | Database SQL (SQLite) | Data user, transaksi, relasional |
| **KV** | Key-value store | Cache, config, session |
| **R2** | Object storage (S3-compat) | File, gambar, backup |
| **Workers AI** | LLM inference | Text gen, embedding, vision |
| **Vectorize** | Vector DB | RAG, semantic search |
| **Queues** | Message queue | Async job, fan-out |
| **Durable Objects** | Stateful instances | Real-time, koordinasi |
| **Analytics Engine** | Time-series DB | Metrics, log, analytics |

## Pola Arsitektur

```
┌──────────────────────────────────────────────────┐
│         Jaringan Global Cloudflare               │
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

## Pages vs Workers — Kapan Pakai Yang Mana?

| Use Case | Solusi |
|---|---|
| Static HTML/JS site | **Pages** |
| Next.js blog (SSG) | **Pages** (dengan `output: 'export'`) |
| API endpoint | **Workers** |
| Auth + database | **Workers + D1** |
| Upload gambar | **Workers + R2** |
| Chat LLM | **Workers + AI** |

## Harga (Free Tier)

| Resource | Batas Gratis |
|---|---|
| Pages | Unlimited sites, 500 build/bulan, 100GB bandwidth |
| Workers | 100.000 request/hari |
| D1 | 5GB storage, 5M reads/hari, 100k writes/hari |
| KV | 100.000 reads/hari, 1.000 writes/hari |
| R2 | 10GB storage, 10M reads/bulan, 1M writes/bulan |
| Workers AI | 10.000 neurons/hari |

Cukup untuk project hobi, prototype, sampai aplikasi produksi skala kecil.

## Lanjut

→ [02. Setup Akun Cloudflare](../02-account-setup/README.md)
