# 06 — Workers + D1: Auth Database

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/06-worker-d1/README.md)

**D1** is Cloudflare's serverless SQLite database. Free tier: 5GB, 5M reads/day.

## Create Database

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

Copy `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## Schema Migration

Create `schema.sql`:

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

Apply locally and remotely:

```bash
# Local (uses .wrangler/state/v3/d1/)
npx wrangler d1 execute my-db --local --file=./schema.sql

# Remote (production)
npx wrangler d1 execute my-db --remote --file=./schema.sql
```

## Worker Code: Auth API

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

// SHA-256 + salt (use PBKDF2/Argon2 for production)
async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(password + salt);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

router.post('/register', async (request, env: Env) => {
  const { email, password } = await request.json<{ email: string; password: string }>();

  if (!email || !password || password.length < 8) {
    return json({ error: 'Email & password (min 8 chars) required' }, 400);
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
      return json({ error: 'Email already registered' }, 409);
    }
    return json({ error: 'Server error' }, 500);
  }
});

router.post('/login', async (request, env: Env) => {
  const { email, password } = await request.json<{ email: string; password: string }>();

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash, is_admin, approved FROM users WHERE email = ?'
  ).bind(email).first<any>();

  if (!user) return json({ error: 'Invalid credentials' }, 401);

  const [salt, hash] = user.password_hash.split(':');
  const attempt = await hashPassword(password, salt);

  if (attempt !== hash) return json({ error: 'Invalid credentials' }, 401);

  // Create JWT (7 days)
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
echo "your-32-byte-random-secret" | npx wrangler secret put JWT_SECRET
```

## Query Patterns

```typescript
// Single row
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(123).first();

// Multiple rows
const { results } = await env.DB.prepare('SELECT * FROM users LIMIT 10').all();

// Insert with auto ID
const r = await env.DB.prepare('INSERT INTO posts (title) VALUES (?)').bind('Hello').run();
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

## Backups

```bash
# Download
npx wrangler d1 export my-db --remote --output=./backup-2026-07-09.sql

# Restore (re-import)
npx wrangler d1 execute my-db --remote --file=./backup-2026-07-09.sql
```

## Common Pitfalls

❌ **Connection pool** — D1 has none; each `prepare()` is a query. Use `batch()` for transactions.
❌ **No JSON column** — store as `TEXT` and `JSON.parse()` in code.
❌ **`-1` for `unixepoch()`** in older Wrangler — use `unixepoch()` only on `compatibility_date >= 2023-08`.
✅ **Always use `bind()`** — never concatenate SQL strings (SQL injection!).

See [`examples/04-worker-auth-d1/`](../../../examples/04-worker-auth-d1/) for full project with JWT, Turnstile, and admin panel.

## Next

→ [07. Workers AI: LLM at the Edge](../07-workers-ai/README.md)
