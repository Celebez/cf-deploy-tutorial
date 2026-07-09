# Example 05 — Workers AI Chat

> LLM inference di edge. Lihat [docs/en/07](../../docs/en/07-workers-ai/README.md) | 🇮🇩 [docs/id/07](../../docs/id/07-workers-ai/README.md)

## Setup

```bash
cd examples/05-workers-ai
npm install
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Routes

| Method | Path | Body | Deskripsi |
|---|---|---|---|
| POST | `/chat` | `{prompt}` | Single chat completion |
| POST | `/chat/stream` | `{prompt}` | Streaming (SSE) |
| POST | `/embed` | `{text: string \| string[]}` | Generate embeddings |
| POST | `/vision/caption` | `{imageUrl}` | Caption image |

## Test

```bash
# Chat
curl -X POST https://my-ai.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Jelaskan cloudflare workers dalam 2 kalimat"}'

# Embedding
curl -X POST https://my-ai.workers.dev/embed \
  -H "Content-Type: application/json" \
  -d '{"text":["hello world","apa kabar"]}'

# Vision
curl -X POST https://my-ai.workers.dev/vision/caption \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/cat.jpg"}'
```

## Models Used

- **Chat**: `@cf/meta/llama-3.2-3b-instruct` (good quality/cost balance)
- **Embedding**: `@cf/baai/bge-m3` (multilingual EN + ID)
- **Vision**: `@cf/unum/uform-gen2-qwen-500m`

## Cost Tips

- 3B model: ~1200 neurons per 1k tokens
- Free tier 10k neurons/day = ~30 chat turns
- Use smaller 1B model for classification
- Cache repeated queries in KV (see Example 06)
