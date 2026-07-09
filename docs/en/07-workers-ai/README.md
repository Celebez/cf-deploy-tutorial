# 07 — Workers AI: LLM at the Edge

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/07-workers-ai/README.md)

Workers AI runs LLMs and embedding models on Cloudflare's GPUs. **No API key needed** — bound directly to your Worker.

Free tier: **10,000 neurons/day** (~10k tokens for small models, less for large).

## Setup `wrangler.toml`

```toml
[ai]
binding = "AI"
```

## Available Models (Jul 2026)

| Model | Type | Use Case |
|---|---|---|
| `@cf/meta/llama-3.2-1b-instruct` | Text (1B) | Fast classification, simple Q&A |
| `@cf/meta/llama-3.2-3b-instruct` | Text (3B) | General chat, decent quality |
| `@cf/meta/llama-3.1-8b-instruct` | Text (8B) | High-quality chat |
| `@cf/mistral/mistral-7b-instruct-v0.1` | Text (7B) | Strong reasoning |
| `@cf/qwen/qwen1.5-7b-chat-awq` | Text (7B) | Multilingual incl. Indonesian |
| `@cf/baai/bge-large-en-v1.5` | Embedding | English semantic search |
| `@cf/baai/bge-small-en-v1.5` | Embedding | Faster, smaller |
| `@cf/baai/bge-m3` | Embedding | **Multilingual (EN + ID)** |
| `@cf/unum/uform-gen2-qwen-500m` | Vision | Image captioning |
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
        { role: 'system', content: 'You are a helpful assistant. Answer concisely.' },
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
  "response": "Sure! Cloudflare Workers run...",
  "tool_calls": null,
  "usage": { "prompt_tokens": 23, "completion_tokens": 18, "total_tokens": 41 }
}
```

## Embeddings (RAG Pattern)

```typescript
const embedding = await env.AI.run('@cf/baai/bge-m3', {
  text: ['apa itu cloudflare workers', 'how to deploy nextjs'],
});

// embedding.data is array of 1024-dim vectors
// Store in Vectorize for semantic search
```

## Vision (Image Captioning)

```typescript
const imageResp = await fetch(imageUrl);
const imageBlob = await imageResp.blob();
const imageArrayBuffer = await imageBlob.arrayBuffer();

const caption = await env.AI.run('@cf/unum/uform-gen2-qwen-500m', {
  image: [...new Uint8Array(imageArrayBuffer)],  // array of bytes
  prompt: 'Describe this image in one sentence.',
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

## Cost Optimization

| Model | Neurons per 1k tokens (approx) |
|---|---|
| llama-3.2-1b | ~300 |
| llama-3.2-3b | ~1,200 |
| llama-3.1-8b | ~3,000 |
| bge-large-en | ~100 |

Free 10k neurons/day = ~30 chat turns with 3b model.

## Pitfalls

❌ **Don't** use 8B model for every request — start with 3b, escalate if needed.
❌ **Don't** send huge prompts — token cost scales linearly.
✅ **Use embeddings** for semantic search instead of full LLM on large corpus.
✅ **Cache** repeated queries in KV (see [08. Bindings](../08-bindings/README.md)).

See [`examples/05-workers-ai/`](../../../examples/05-workers-ai/) for full chat + RAG example.

## Next

→ [08. Bindings: KV, R2, Queues, Durable Objects](../08-bindings/README.md)
