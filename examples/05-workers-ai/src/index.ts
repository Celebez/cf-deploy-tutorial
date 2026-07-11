export interface Env {
  AI: Ai;
  CACHE?: KVNamespace;
  // Comma-separated allowed origins. If unset, defaults to '*' (dev only).
  CORS_ORIGIN?: string;
}

// Allowed origins — set at fetch time from env, falls back to '*' for dev.
let CORS_ORIGIN = '*';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    CORS_ORIGIN = env.CORS_ORIGIN ?? '*';
    if (request.method === 'OPTIONS') return json(null, 204);
    const url = new URL(request.url);

    // Chat completion
    if (url.pathname === '/chat' && request.method === 'POST') {
      const { prompt, model } = await request.json<{ prompt: string; model?: string }>();
      if (!prompt) return json({ error: 'prompt required' }, 400);

      // Cache key (hash prompt)
      const cacheKey = `chat:${await sha256(prompt)}`;
      if (env.CACHE) {
        const cached = await env.CACHE.get(cacheKey);
        if (cached) return json({ source: 'cache', response: cached });
      }

      const response = await env.AI.run(model || '@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: 'Kamu adalah asisten yang helpful. Jawab singkat dan jelas.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }) as { response: string };

      if (env.CACHE) await env.CACHE.put(cacheKey, response.response, { expirationTtl: 3600 });
      return json({ source: 'ai', ...response });
    }

    // Streaming chat
    if (url.pathname === '/chat/stream' && request.method === 'POST') {
      const { prompt } = await request.json<{ prompt: string }>();
      if (!prompt) return json({ error: 'prompt required' }, 400);

      try {
        const stream = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          max_tokens: 512,
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } catch (e: any) {
        return json({ error: 'AI streaming failed', detail: e?.message ?? 'unknown' }, 500);
      }
    }

    // Embedding
    if (url.pathname === '/embed' && request.method === 'POST') {
      const { text } = await request.json<{ text: string | string[] }>();
      if (!text) return json({ error: 'text required' }, 400);

      const result = await env.AI.run('@cf/baai/bge-m3', { text: Array.isArray(text) ? text : [text] }) as any;
      return json({
        model: 'bge-m3',
        dimensions: 1024,
        vectors: result.data ?? result,
      });
    }

    // Vision captioning
    if (url.pathname === '/vision/caption' && request.method === 'POST') {
      const { imageUrl } = await request.json<{ imageUrl: string }>();
      if (!imageUrl) return json({ error: 'imageUrl required' }, 400);

      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) return json({ error: `Failed to fetch image: ${imgResp.status}` }, 400);
      const blob = await imgResp.arrayBuffer();
      const bytes = [...new Uint8Array(blob)];

      const caption = await env.AI.run('@cf/unum/uform-gen2-qwen-500m', {
        image: bytes,
        prompt: 'Deskripsikan gambar ini dalam satu kalimat.',
      }) as { description?: string; response?: string };

      return json({ caption: caption.description ?? caption.response ?? caption });
    }

    return json({
      routes: {
        chat: 'POST /chat {prompt, model?}',
        chatStream: 'POST /chat/stream {prompt}',
        embed: 'POST /embed {text: string | string[]}',
        vision: 'POST /vision/caption {imageUrl}',
      },
    });
  },
};

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
