import { Router } from 'itty-router';

export interface Env {
  CACHE: KVNamespace;
}

interface User {
  id: string;
  name: string;
  email: string;
  created_at: number;
}

const router = Router();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

// CORS preflight
router.options('*', () => json(null, 204));

// Health check
router.get('/ping', (request: Request) => {
  return json({
    ok: true,
    edge: (request as any).cf?.colo ?? 'unknown',
    country: (request as any).cf?.country ?? 'unknown',
    timestamp: Date.now(),
  });
});

// KV cache demo
router.get('/cache-demo', async (_, env: Env) => {
  const cached = await env.CACHE.get('demo', 'json');
  if (cached) return json({ source: 'kv-cache', value: cached });

  const fresh = { counter: Math.random(), t: Date.now() };
  await env.CACHE.put('demo', JSON.stringify(fresh), { expirationTtl: 60 });
  return json({ source: 'origin', value: fresh });
});

// Users CRUD (KV-backed)
router.get('/users', async (_, env: Env) => {
  const list = await env.CACHE.list({ prefix: 'user:' });
  const users: User[] = [];
  for (const key of list.keys) {
    const u = await env.CACHE.get<User>(key.name, 'json');
    if (u) users.push(u);
  }
  return json({ count: users.length, users });
});

router.post('/users', async (request: Request, env: Env) => {
  const body = await request.json<{ name: string; email: string }>();
  if (!body.name || !body.email) {
    return json({ error: 'name & email required' }, 400);
  }

  const id = crypto.randomUUID();
  const user: User = {
    id,
    name: body.name,
    email: body.email,
    created_at: Date.now(),
  };

  await env.CACHE.put(`user:${id}`, JSON.stringify(user));
  return json({ created: user }, 201);
});

router.get('/users/:id', async ({ params }, env: Env) => {
  const user = await env.CACHE.get<User>(`user:${params.id}`, 'json');
  if (!user) return json({ error: 'Not found' }, 404);
  return json(user);
});

router.delete('/users/:id', async ({ params }, env: Env) => {
  await env.CACHE.delete(`user:${params.id}`);
  return json({ deleted: params.id });
});

// 404
router.all('*', () => json({ error: 'Not Found' }, 404));

export default {
  fetch: router.handle,
};
