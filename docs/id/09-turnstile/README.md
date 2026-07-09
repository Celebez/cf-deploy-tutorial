# 09 — Turnstile: Anti-Bot Protection

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/09-turnstile/README.md)

**Cloudflare Turnstile** adalah CAPTCHA alternatif gratis yang menghormati privasi. User tidak perlu pecahkan puzzle — Turnstile pakai sinyal browser untuk deteksi bot secara invisibel.

## Buat Widget

### Opsi A: Dashboard
1. https://dash.cloudflare.com → "Turnstile"
2. "Add Widget"
3. Name: `my-auth`
4. Domains: `yourdomain.com`, `yourapp.pages.dev`
5. Mode: `Managed` (adaptive, invisibel jika memungkinkan)
6. Copy **Site Key** (publik) dan **Secret Key** (private)

### Opsi B: API

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

⚠️ **Pitfall**: Endpoint adalah `/accounts/{id}/challenges/widgets` — BUKAN `/turnstile/widgets` (404).

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
    alert(data.ok ? 'Terdaftar!' : data.error);
  };

  return (
    <form onSubmit={submit}>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
      <Turnstile sitekey={TURNSTILE_SITEKEY} onVerify={setToken} theme="dark" />
      <button type="submit">Daftar</button>
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
    body: formData,  // BUKAN JSON — harus form-urlencoded atau multipart
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
    if (!valid) return Response.json({ error: 'Bot terdeteksi' }, { status: 403 });

    // ... lanjut dengan registrasi
    return Response.json({ ok: true });
  },
};
```

### Set Secret

```bash
echo "0x4AAAAAAA..." | npx wrangler secret put TURNSTILE_SECRET
```

## Test Mode

Untuk development, tambah `127.0.0.1` ke domain widget, lalu pakai test key Cloudflare:

```
Site Key:   1x00000000000000000000AA
Secret Key: 1x0000000000000000000000000000000AA
```

Selalu success (test pass).

Test failure:
```
Site Key:   2x00000000000000000000AB
Secret Key: 2x0000000000000000000000000000000AA
```

## Pitfalls

❌ **Body JSON** untuk siteverify — harus pakai `FormData` (multipart/form-urlencoded).
❌ **Lupa `remoteip`** — passing IP meningkatkan akurasi.
❌ **Single widget untuk banyak domain** — tambah SEMUA domain (termasuk `*.pages.dev`).
❌ **Tidak ada rate limiting** — Turnstile stop bot, tapi user legitimate masih bisa spam. Tambah rate limit di level Worker (D1/KV).
✅ **Selalu verify di server** — jangan percaya validasi frontend saja.

## Checklist Security Audit

Untuk Worker auth API:
1. ✅ **CORS** — restrict ke domain yang dikenal di production.
2. ✅ **Rate limiting** — counter per-IP di D1/KV.
3. ✅ **Turnstile** di register + login + forgot-password.
4. ✅ **PBKDF2 / Argon2** daripada plain SHA-256 untuk password.
5. ✅ **JWT expiry** — max 7 hari, refresh token pattern untuk lebih lama.
6. ✅ **Error generik** — jangan reveal kalau email ada di login (`Kredensial invalid` untuk kedua-duanya).

Lihat [`examples/04-worker-auth-d1/`](../../../examples/04-worker-auth-d1/) untuk integrasi lengkap.

## Lanjut

→ [10. Custom Domain + DNS](../10-custom-domain/README.md)
