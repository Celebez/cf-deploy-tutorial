import { Router } from 'itty-router';
import { SignJWT, jwtVerify } from 'jose';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  TURNSTILE_SECRET?: string;
  // Comma-separated allowed origins. If unset, defaults to '*' (dev only).
  CORS_ORIGIN?: string;
  // Set to "1" in production to hard-require Turnstile even if secret unset.
  PROD?: string;
  // One-time token to create the first admin (set via `wrangler secret put`).
  BOOTSTRAP_TOKEN?: string;
}

interface User {
  id: number;
  email: string;
  is_admin: number;
  approved: number;
}

const router = Router({ base: '/api' });

// Allowed origins — set at fetch time from env, falls back to '*' for dev.
let CORS_ORIGIN = '*';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN },
  });

// PBKDF2 via Web Crypto
async function hashPassword(password: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: Uint8Array.from(atob(saltB64), c => c.charCodeAt(0)),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function makeHash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hash = await hashPassword(password, saltB64);
  return `${saltB64}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hash] = stored.split(':');
  if (!saltB64 || !hash) return false;
  const attempt = await hashPassword(password, saltB64);
  return attempt === hash;
}

async function makeJWT(user: User, secret: string): Promise<string> {
  return await new SignJWT({ sub: String(user.id), email: user.email, admin: !!user.is_admin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
}

async function verifyJWT(token: string, secret: string): Promise<any> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  return payload;
}

async function auth(request: Request, env: Env, requireAdmin = false): Promise<User | Response> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return json({ error: 'Missing token' }, 401);
  }
  try {
    const payload = await verifyJWT(header.slice(7), env.JWT_SECRET);
    const user = await env.DB.prepare(
      'SELECT id, email, is_admin, approved FROM users WHERE id = ?'
    ).bind(Number(payload.sub)).first<User>();

    if (!user) return json({ error: 'User not found' }, 401);
    if (!user.approved) return json({ error: 'Account not approved' }, 403);
    if (requireAdmin && !user.is_admin) return json({ error: 'Admin required' }, 403);
    return user;
  } catch (e) {
    return json({ error: 'Invalid token' }, 401);
  }
}

// Optional Turnstile verification
async function verifyTurnstile(token: string, secret: string, ip: string): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const data = await res.json() as any;
  return data.success === true;
}

// Enforce Turnstile when configured OR running in production mode.
function turnstileRequired(env: Env): boolean {
  return !!env.TURNSTILE_SECRET || env.PROD === '1';
}

// === Routes ===

// One-time admin bootstrap (no admin exists yet, or token matches BOOTSTRAP_TOKEN)
router.post('/bootstrap-admin', async (request: Request, env: Env) => {
  if (!env.BOOTSTRAP_TOKEN) {
    return json({ error: 'Bootstrap disabled (no BOOTSTRAP_TOKEN set)' }, 403);
  }
  const { email, password, token } = await request.json<any>();
  if (token !== env.BOOTSTRAP_TOKEN) return json({ error: 'Invalid bootstrap token' }, 403);
  if (!email || !password || password.length < 8) {
    return json({ error: 'Email & password (min 8 char) wajib' }, 400);
  }

  const password_hash = await makeHash(password);
  try {
    const result = await env.DB.prepare(
      'INSERT INTO users (email, password_hash, is_admin, approved) VALUES (?, ?, 1, 1)'
    ).bind(email, password_hash).run();
    return json({ ok: true, admin_id: result.meta.last_row_id }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return json({ error: 'Email sudah terdaftar' }, 409);
    }
    return json({ error: 'Server error' }, 500);
  }
});

router.post('/register', async (request: Request, env: Env) => {
  const { email, password, turnstileToken } = await request.json<any>();

  if (!email || !password || password.length < 8) {
    return json({ error: 'Email & password (min 8 char) wajib' }, 400);
  }

  // Optional-but-enforced Turnstile check (fail-closed in prod)
  if (turnstileRequired(env)) {
    if (!turnstileToken) return json({ error: 'Verifikasi bot wajib' }, 403);
    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
    const valid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET ?? '', ip);
    if (!valid) return json({ error: 'Bot terdeteksi' }, 403);
  }

  const password_hash = await makeHash(password);

  try {
    const result = await env.DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    ).bind(email, password_hash).run();
    return json({ ok: true, user_id: result.meta.last_row_id, approved: false }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return json({ error: 'Email sudah terdaftar' }, 409);
    }
    return json({ error: 'Server error' }, 500);
  }
});

router.post('/login', async (request: Request, env: Env) => {
  const { email, password } = await request.json<any>();

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, is_admin, approved FROM users WHERE email = ?'
  ).bind(email).first<User & { password_hash: string }>();

  if (!user) return json({ error: 'Kredensial invalid' }, 401);

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return json({ error: 'Kredensial invalid' }, 401);

  if (!user.approved) return json({ error: 'Akun belum disetujui admin' }, 403);

  const token = await makeJWT(user, env.JWT_SECRET);
  return json({
    token,
    user: { id: user.id, email: user.email, admin: !!user.is_admin },
  });
});

router.get('/me', async (request: Request, env: Env) => {
  const result = await auth(request, env);
  if (result instanceof Response) return result;
  return json({ id: result.id, email: result.email, admin: !!result.is_admin });
});

router.get('/admin/users', async (request: Request, env: Env) => {
  const result = await auth(request, env, true);
  if (result instanceof Response) return result;

  const { results } = await env.DB.prepare(
    'SELECT id, email, is_admin, approved, created_at FROM users ORDER BY created_at DESC LIMIT 100'
  ).all();
  return json({ count: results.length, users: results });
});

router.post('/admin/users/:id/approve', async (request: Request, env: Env) => {
  const result = await auth(request, env, true);
  if (result instanceof Response) return result;

  await env.DB.prepare('UPDATE users SET approved = 1 WHERE id = ?')
    .bind(Number((request as any).params.id)).run();
  return json({ ok: true });
});

router.all('*', () => json({ error: 'Not Found' }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    CORS_ORIGIN = env.CORS_ORIGIN ?? '*';
    return router.handle(request, env, ctx);
  },
};
