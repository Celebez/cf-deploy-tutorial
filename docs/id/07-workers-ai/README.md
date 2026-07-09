# 07 — Workers AI: LLM di Edge

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/07-workers-ai/README.md)

Workers AI menjalankan LLM dan embedding model di GPU Cloudflare. **Tidak butuh API key** — bound langsung ke Worker kamu.

Free tier: **10.000 neurons/hari** (~10k token untuk model kecil, lebih sedikit untuk yang besar).

## Setup `wrangler.toml`

```toml
[ai]
binding = "AI"
```

## Model yang Tersedia (Jul 2026)

| Model | Tipe | Use Case |
|---|---|---|
| `@cf/meta/llama-3.2-1b-instruct` | Text (1B) | Klasifikasi cepat, Q&A simpel |
| `@cf/meta/llama-3.2-3b-instruct` | Text (3B) | Chat umum, kualitas cukup |
| `@cf/meta/llama-3.1-8b-instruct` | Text (8B) | Chat kualitas tinggi |
| `@cf/mistral/mistral-7b-instruct-v0.1` | Text (7B) | Reasoning kuat |
| `@cf/qwen/qwen1.5-7b-chat-awq` | Text (7B) | Multilingual termasuk Indonesia |
| `@cf/baai/bge-large-en-v1.5` | Embedding | Semantic search English |
| `@cf/baai/bge-small-en-v1.5` | Embedding | Lebih cepat, lebih kecil |
| `@cf/baai/bge-m3` | Embedding | **Multilingual (EN + ID)** |
| `@cf/unum/uform-gen2-qwen-500m` | Vision | Caption gambar |
| `@cf/meta/llama-3.2-11b-vision-instruct` | Vision | Multimodal (text + image) |

## Chat Completion

```typescript
export interface Env {
  AI: Ai;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('POST { prompt }', { status: 405 });
    }
    const { prompt } = await request.json<{ prompt: string }>();

    const response = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: 'Kamu adalah asisten yang helpful. Jawab singkat.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 256,
      temperature: 0.7,
    });

    return Response.json(response);
  },
};
```

Response shape:
```json
{
  "response": "Tentu! Cloudflare Workers menjalankan...",
  "tool_calls": null,
  "usage": { "prompt_tokens": 23, "completion_tokens": 18, "total_tokens": 41 }
}
```

## Embeddings (Pola RAG)

```typescript
const embedding = await env.AI.run('@cf/baai/bge-m3', {
  text: ['apa itu cloudflare workers', 'cara deploy nextjs'],
});

// embedding.data adalah array vector 1024-dim
// Simpan di Vectorize untuk semantic search
```

## Vision (Caption Gambar)

```typescript
const imageResp = await fetch(imageUrl);
const imageBlob = await imageResp.blob();
const imageArrayBuffer = await imageBlob.arrayBuffer();

const caption = await env.AI.run('@cf/unum/uform-gen2-qwen-500m', {
  image: [...new Uint8Array(imageArrayBuffer)],  // array of bytes
  prompt: 'Deskripsikan gambar ini dalam satu kalimat.',
});

return Response.json(caption);
```

## Streaming (Server-Sent Events)

```typescript
const stream = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});

return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

## Optimasi Biaya

| Model | Neurons per 1k token (perkiraan) |
|---|---|
| llama-3.2-1b | ~300 |
| llama-3.2-3b | ~1.200 |
| llama-3.1-8b | ~3.000 |
| bge-large-en | ~100 |

Free 10k neurons/hari = ~30 chat turn pakai model 3b.

## Pitfalls

❌ **Jangan** pakai model 8B untuk setiap request — mulai dari 3b, escalate jika perlu.
❌ **Jangan** kirim prompt raksasa — biaya token naik linier.
✅ **Pakai embedding** untuk semantic search daripada LLM penuh untuk corpus besar.
✅ **Cache** query berulang di KV (lihat [08. Bindings](../08-bindings/README.md)).

Lihat [`examples/05-workers-ai/`](../../../examples/05-workers-ai/) untuk contoh chat + RAG lengkap.

## Lanjut

→ [08. Bindings: KV, R2, Queues, Durable Objects](../08-bindings/README.md)
