import { Router } from 'itty-router';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  AI: Ai;
  COUNTER: DurableObjectNamespace;
  // Comma-separated allowed origins. If unset, defaults to '*' (dev only).
  CORS_ORIGIN?: string;
}

// === Durable Object ===
export class Counter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const count = ((await this.state.storage.get<number>('count')) ?? 0);

    if (url.pathname === '/increment') {
      const newCount = count + 1;
      await this.state.storage.put('count', newCount);
      return Response.json({ count: newCount });
    }

    if (url.pathname === '/get') {
      return Response.json({ count });
    }

    return new Response('Not Found', { status: 404 });
  }
}

// === Main Worker ===
const router = Router();

// Allowed origins — set at fetch time from env, falls back to '*' for dev.
let CORS_ORIGIN = '*';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN },
  });

router.options('*', () => json(null, 204));

// Create note (D1 + AI)
router.post('/notes', async (request: Request, env: Env) => {
  const { title, body, userId = 'anonymous' } = await request.json<any>();
  if (!title || !body) return json({ error: 'title & body required' }, 400);

  // Auto-summarize with AI
  let summary: string | null = null;
  try {
    const ai = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', {
      messages: [
        { role: 'system', content: 'Buat ringkasan dalam 1 kalimat.' },
        { role: 'user', content: body },
      ],
      max_tokens: 60,
    }) as { response: string };
    summary = ai.response;
  } catch {
    summary = null;
  }

  const result = await env.DB.prepare(
    'INSERT INTO notes (title, body, summary, user_id) VALUES (?, ?, ?, ?) RETURNING *'
  ).bind(title, body, summary, userId).first();

  // Invalidate cache
  await env.CACHE.delete(`notes:list:${userId}`);

  return json({ created: result }, 201);
});

// List notes (D1 + KV cache)
router.get('/notes', async (request: Request, env: Env) => {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') ?? 'anonymous';
  const cacheKey = `notes:list:${userId}`;

  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json({ source: 'cache', ...cached as any });

  const { results } = await env.DB.prepare(
    'SELECT id, title, summary, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(userId).all();

  const data = { count: results.length, notes: results };
  await env.CACHE.put(cacheKey, JSON.stringify(data), { expirationTtl: 60 });
  return json({ source: 'db', ...data });
});

// Get single note (D1 + KV)
router.get('/notes/:id', async ({ params }, env: Env) => {
  const cacheKey = `notes:${params.id}`;
  const cached = await env.CACHE.get(cacheKey, 'json');
  if (cached) return json({ source: 'cache', note: cached });

  const note = await env.DB.prepare(
    'SELECT * FROM notes WHERE id = ?'
  ).bind(params.id).first();

  if (!note) return json({ error: 'Not found' }, 404);
  await env.CACHE.put(cacheKey, JSON.stringify(note), { expirationTtl: 300 });
  return json({ source: 'db', note });
});

// Upload file (R2 + D1)
router.post('/upload', async (request: Request, env: Env) => {
  const formData = await request.formData();
  const file = formData.get('file') as unknown;
  if (!(file instanceof File)) return json({ error: 'file required' }, 400);

  const id = crypto.randomUUID();
  const r2Key = `uploads/${id}-${file.name}`;

  await env.STORAGE.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  await env.DB.prepare(
    'INSERT INTO files (id, filename, content_type, size, r2_key) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, file.name, file.type, file.size, r2Key).run();

  return json({ id, filename: file.name, size: file.size, r2Key }, 201);
});

// Download file (R2 + D1)
router.get('/files/:id', async ({ params }, env: Env) => {
  const file = await env.DB.prepare(
    'SELECT * FROM files WHERE id = ?'
  ).bind(params.id).first<any>();

  if (!file) return json({ error: 'Not found' }, 404);

  const obj = await env.STORAGE.get(file.r2_key);
  if (!obj) return json({ error: 'File missing in R2' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': file.content_type,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
    },
  });
});

// Counter (Durable Object)
router.post('/counter/increment', async (request: Request, env: Env) => {
  const userId = new URL(request.url).searchParams.get('userId') ?? 'global';
  const id = env.COUNTER.idFromName(userId);
  const stub = env.COUNTER.get(id);
  return stub.fetch('https://counter/increment');
});

router.get('/counter/:userId', async ({ params }, env: Env) => {
  const id = env.COUNTER.idFromName(params.userId);
  const stub = env.COUNTER.get(id);
  return stub.fetch('https://counter/get');
});

router.all('*', () => json({ error: 'Not Found' }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    CORS_ORIGIN = env.CORS_ORIGIN ?? '*';
    return router.handle(request, env, ctx);
  },
};
