# 06 — Workers + D1: Auth Database

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/06-worker-d1/README.md)

**D1** adalah database SQLite serverless dari Cloudflare. Free tier: 5GB, 5M reads/hari.

## Buat Database

```bash
npx wrangler d1 create my-db
```

Output:
```
✅ Successfully created DB 'my-db'
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy `database_id` ke `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Migrasi Schema

Buat `schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_users_email ON users(email);
```

Apply lokal dan remote:

```bash
# Lokal (pakai .wrangler/state/v3/d1/)
npx wrangler d1 execute my-db --local --file=./schema.sql

# Remote (production)
npx wrangler d1 execute my-db --remote --file=./schema.sql
```

## Kode Worker: Auth API

```typescript
import { Router } from 'itty-router';
import { jwtVerify, SignJWT } from 'jose';  // npm i jose

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const router = Router({ base: '/api' });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

// SHA-256 + salt (pakai PBKDF2/Argon2 untuk production)
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(password + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

router.post('/register', async (request, env: Env) => {
  const { email, password } = await request.json<{ email: string; password: string }>();

  if (!email || !password || password.length < 8) {
    return json({ error: 'Email & password (min 8 char) wajib' }, 400);
  }

  const salt = crypto.randomUUID();
  const hash = await hashPassword(password, salt);

  try {
    const result = await env.DB.prepare(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)'
    ).bind(email, `${salt}:${hash}`).run();

    return json({ ok: true, user_id: result.meta.last_row_id }, 201);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return json({ error: 'Email sudah terdaftar' }, 409);
    }
    return json({ error: 'Server error' }, 500);
  }
});

router.post('/login', async (request, env: Env) => {
  const { email, password } = await request.json<{ email: string; password: string }>();

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, is_admin, approved FROM users WHERE email = ?'
  ).bind(email).first<any>();

  if (!user) return json({ error: 'Kredensial invalid' }, 401);

  const [salt, hash] = user.password_hash.split(':');
  const attempt = await hashPassword(password, salt);

  if (attempt !== hash) return json({ error: 'Kredensial invalid' }, 401);

  // Buat JWT (7 hari)
  const token = await new SignJWT({ sub: user.id, email: user.email, admin: user.is_admin })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(env.JWT_SECRET));

  return json({ token, user: { id: user.id, email: user.email } });
});

export default {
  fetch: router.handle,
};
```

## Set JWT Secret

```bash
echo "random-secret-32-byte-kamu" | npx wrangler secret put JWT_SECRET
```

## Pola Query

```typescript
// Single row
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(123).first();

// Multiple rows
const { results } = await env.DB.prepare('SELECT * FROM users LIMIT 10').all();

// Insert dengan auto ID
const r = await env.DB.prepare('INSERT INTO posts (title) VALUES (?)').bind('Halo').run();
const id = r.meta.last_row_id;

// Batch insert
const stmt = env.DB.batch([
  env.DB.prepare('INSERT INTO ...').bind(...),
  env.DB.prepare('INSERT INTO ...').bind(...),
]);
await stmt;
```

## Pagination

```typescript
router.get('/users', async (request, env: Env) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
  const offset = (page - 1) * limit;

  const { results } = await env.DB.prepare(
    'SELECT id, email, created_at FROM users LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  return json({ page, limit, users: results });
});
```

## Backup

```bash
# Download
npx wrangler d1 export my-db --remote --output=./backup-2026-07-09.sql

# Restore (re-import)
npx wrangler d1 execute my-db --remote --file=./backup-2026-07-09.sql
```

## Pitfall yang Umum

❌ **Connection pool** — D1 tidak punya; setiap `prepare()` adalah satu query. Pakai `batch()` untuk transaksi.
❌ **Tidak ada kolom JSON** — simpan sebagai `TEXT` dan `JSON.parse()` di kode.
❌ **Inkonsistensi `unixepoch()`** — pakai hanya jika `compatibility_date >= 2023-08`.
✅ **Selalu pakai `bind()`** — jangan concat string SQL (SQL injection!).

Lihat [`examples/04-worker-auth-d1/`](../../../examples/04-worker-auth-d1/) untuk project lengkap dengan JWT, Turnstile, dan admin panel.

## Lanjut

→ [07. Workers AI: LLM di Edge](../07-workers-ai/README.md)
