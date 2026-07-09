# 04 — Pages: Next.js Static Export

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/04-pages-nextjs/README.md)

Next.js 15 dengan `output: 'export'` menghasilkan static site yang bisa di-deploy ke Pages.

## Setup

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
```

## `next.config.ts` (WAJIB)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",         // ← KRITIS: static export
  images: {
    unoptimized: true,      // ← KRITIS: Next.js Image butuh ini untuk static
  },
  trailingSlash: true,      // Optional: URL bersih seperti /about/
};

export default nextConfig;
```

**Kenapa dua flag ini wajib:**
- `output: 'export'` — menyuruh Next.js pre-render SEMUA halaman saat build. Tanpa ini, Next.js coba SSR yang tidak disupport Pages.
- `images.unoptimized: true` — Komponen Next.js Image normalnya panggil `/_next/image` yang merupakan server route. Dengan static export, route itu tidak ada, jadi gambar rusak tanpa flag ini.

## Build

```bash
npm run build
```

Output masuk ke `./out/`. Verifikasi:

```bash
ls out/
# index.html  about.html  _next/  ...
```

## Deploy

### Opsi A: Wrangler

```bash
npx wrangler pages deploy out --project-name=my-app --branch=main
```

### Opsi B: Integrasi GitHub

Build settings:
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: `/` (atau `my-app/` jika monorepo)
- **Node version**: 20 (set via env var `NODE_VERSION=20`)

Environment variables (jika perlu):
- `NODE_VERSION=20`

## Catatan Tailwind CSS v4

Tailwind v4 TIDAK punya file config. Konfigurasi ada di CSS:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #00d4ff;
  --color-bg: #0a0a0a;
}
```

**Pitfall**: Jangan pakai `tailwind.config.ts/js` — hapus jika ada.
**Pitfall**: Sintaks `bg-primary/10` opacity mungkin tidak jalan di v4. Pakai alpha eksplisit:
```css
background: color-mix(in srgb, var(--color-primary) 10%, transparent);
```

## Error Build yang Umum

### `Another next build process is already running`
```bash
rm .next/build.lock
npm run build
```

### `Image Optimization not supported`
Tambah `images: { unoptimized: true }` di `next.config.ts`.

### `useState only works in Client Components`
Tambah `'use client'` di atas file:
```typescript
'use client'
import { useState } from 'react'
```

## Pitfall: Stale Build Cache

Kalau kamu ubah kode tapi `out/` masih konten lama:
```bash
rm -rf out/ .next/
npm run build
npx wrangler pages deploy out --project-name=my-app --branch=main
```

Lihat [`examples/02-nextjs-static/`](../../../examples/02-nextjs-static/) untuk project lengkap.

## Lanjut

→ [05. Workers: API Server](../05-worker-api/README.md)
