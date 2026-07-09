# 03 — Pages: Static Site (HTML)

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/03-pages-static/README.md)

Kasus paling sederhana: HTML/CSS/JS murni, tanpa build step. Tinggal upload folder.

## Struktur Project

```
my-site/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── (tidak butuh package.json)
```

## Contoh: `public/index.html`

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My CF Pages Site</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <h1>🚀 Halo dari Cloudflare Pages</h1>
    <p>Dilayani dari 300+ lokasi edge di seluruh dunia.</p>
    <button id="ping">Ping Worker API</button>
    <pre id="out">Klik tombol...</pre>
  </main>
  <script src="script.js"></script>
</body>
</html>
```

## `public/style.css`

```css
:root {
  --bg: #0a0a0a;
  --fg: #e5e5e5;
  --accent: #00d4ff;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  display: grid;
  place-items: center;
}
main { max-width: 600px; padding: 2rem; text-align: center; }
h1 { color: var(--accent); margin-bottom: 1rem; }
button {
  margin-top: 1.5rem;
  padding: .75rem 1.5rem;
  background: var(--accent);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
pre {
  margin-top: 1rem;
  padding: 1rem;
  background: #111;
  border-radius: 8px;
  text-align: left;
  overflow-x: auto;
}
```

## `public/script.js`

```javascript
document.getElementById('ping').addEventListener('click', async () => {
  const out = document.getElementById('out');
  out.textContent = 'Pinging...';
  try {
    // Lihat example 03 untuk setup Worker API
    const res = await fetch('https://my-api.example.workers.dev/ping');
    const data = await res.json();
    out.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    out.textContent = 'Error: ' + err.message;
  }
});
```

## Deploy

### Opsi A: Wrangler CLI

```bash
cd my-site
npx wrangler pages deploy public --project-name=my-site --branch=main
```

Output:
```
✨ Success! Uploaded 3 files (12.4 KiB)
🌎 https://my-site.pages.dev
```

### Opsi B: Hubungkan GitHub

1. Push code ke GitHub
2. Cloudflare Dashboard → Pages → "Create application" → "Connect to Git"
3. Pilih repo, set build command: *(kosong)*, output dir: `public`
4. Klik "Save and Deploy"
5. `git push` berikutnya trigger auto-deploy

### Opsi C: REST API

```bash
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/my-site/deployments" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -F "manifest=@<(echo '{\"files\":{\"index.html\":\"public/index.html\",\"style.css\":\"public/style.css\",\"script.js\":\"public/script.js\"}}')" \
  -F "file=@public/index.html" \
  -F "file=@public/style.css" \
  -F "file=@public/script.js"
```

Lihat [`examples/01-static-site/`](../../../examples/01-static-site/) untuk runnable lengkap.

## Pitfalls

❌ **Jangan** taruh `_headers` atau `_redirects` di dalam `public/` — Cloudflare baca dari root project.
❌ **Jangan** campur `public/` dengan repo root di `wrangler.toml` — Cloudflare expect publish dir relatif ke project.
✅ **Set header `Content-Type`** lewat file `_headers` jika perlu.
✅ **Test lokal** dengan `npx wrangler pages dev public` sebelum deploy.

## Lanjut

→ [04. Pages: Next.js Static Export](../04-pages-nextjs/README.md)
