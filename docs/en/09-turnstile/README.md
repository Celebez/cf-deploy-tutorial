# 09 — Turnstile: Anti-Bot Protection

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/09-turnstile/README.md)

**Cloudflare Turnstile** is a free, privacy-preserving CAPTCHA alternative. Users don't solve puzzles — Turnstile uses browser signals to detect bots invisibly.

## Create Widget

### Option A: Dashboard
1. https://dash.cloudflare.com → "Turnstile"
2. "Add Widget"
3. Name: `my-auth`
4. Domains: `yourdomain.com`, `yourapp.pages.dev`
5. Mode: `Managed` (adaptive, invisible when possible)
6. Copy **Site Key** (public) and **Secret Key** (private)

### Option B: API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/challenges/widgets" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: your-global-key" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "my-auth",
    "domains": ["yourdomain.com", "yourapp.pages.dev"],
    "mode": "managed"
  }'
```

⚠️ **Pitfall**: Endpoint is `/accounts/{id}/challenges/widgets` — NOT `/turnstile/widgets` (404).

## Frontend (React/Next.js)

```bash
npm install react-turnstile
```

```tsx
'use client';
import Turnstile from 'react-turnstile';
import { useState } from 'react';

const TURNSTILE_SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY!;

export default function RegisterForm() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert('Verifikasi keamanan wajib');

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, turnstileToken: token }),
    });
    const data = await res.json();
    alert(data.ok ? 'Registered!' : data.error);
  };

  return (
    <form onSubmit={submit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <Turnstile sitekey={TURNSTILE_SITEKEY} onVerify={setToken} theme="dark" />
      <button type="submit">Register</button>
    </form>
  );
}
```

## Backend (Worker Verification)

```typescript
async function verifyTurnstile(token: string, secret: string, remoteIp: string): Promise<boolean> {
  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  formData.append('remoteip', remoteIp);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,  // NOT JSON — must be form-urlencoded or multipart
  });
  const data = await res.json();
  return data.success === true;
}

export interface Env {
  TURNSTILE_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname !== '/api/register') {
      return new Response('Not Found', { status: 404 });
    }

    const { email, password, turnstileToken } = await request.json<any>();
    const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';

    if (!turnstileToken) {
      return Response.json({ error: 'Verifikasi bot wajib' }, { status: 403 });
    }

    const valid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET, ip);
    if (!valid) return Response.json({ error: 'Bot detected' }, { status: 403 });

    // ... continue with registration
    return Response.json({ ok: true });
  },
};
```

### Set Secret

```bash
echo "0x4AAAAAAA..." | npx wrangler secret put TURNSTILE_SECRET
```

## Test Mode

For development, add `127.0.0.1` to widget domains, then use Cloudflare's test keys:

```
Site Key:   1x00000000000000000000AA
Secret Key: 1x0000000000000000000000000000000AA
```

These always pass (success) or always fail (fail keys available).

Test failure:
```
Site Key:   2x00000000000000000000AB
Secret Key: 2x0000000000000000000000000000000AA
```

## Pitfalls

❌ **JSON body** for siteverify — must use `FormData` (multipart/form-urlencoded).
❌ **Forget `remoteip`** — passing IP improves accuracy.
❌ **Single widget for many domains** — add ALL domains (including `*.pages.dev`).
❌ **No rate limiting** — Turnstile stops bots, but legit users can still spam. Add Worker-level rate limit (D1/KV).
✅ **Always verify server-side** — never trust frontend-only validation.

## Security Audit Checklist

For Worker auth APIs:
1. ✅ **CORS** — set `CORS_ORIGIN` env to your domain(s); never ship `*` to production.
2. ✅ **Rate limiting** — IP-based counter in D1/KV.
3. ✅ **Turnstile** on register + login + forgot-password. In `example 04`, Turnstile is enforced whenever `TURNSTILE_SECRET` is set OR `PROD="1"` (fail-closed — requests without a valid token are rejected, never silently passed).
4. ✅ **PBKDF2 / Argon2** instead of plain SHA-256 for passwords.
5. ✅ **JWT expiry** — 7 days max, refresh token pattern for longer.
6. ✅ **Generic error** — don't reveal if email exists on login (`Invalid credentials` for both).

See [`examples/04-worker-auth-d1/`](../../../examples/04-worker-auth-d1/) for full integration.

## Next

→ [10. Custom Domain + DNS](../10-custom-domain/README.md)
