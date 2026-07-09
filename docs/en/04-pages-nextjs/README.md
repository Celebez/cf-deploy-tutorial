# 04 — Pages: Next.js Static Export

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/04-pages-nextjs/README.md)

Next.js 15 with `output: 'export'` produces a fully static site deployable to Pages.

## Setup

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
```

## `next.config.ts` (REQUIRED)

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",         // ← CRITICAL: static export
  images: {
    unoptimized: true,      // ← CRITICAL: Next.js Image needs this for static
  },
  trailingSlash: true,      // Optional: clean URLs like /about/
};

export default nextConfig;
```

**Why these two flags are non-negotiable:**
- `output: 'export'` — tells Next.js to pre-render ALL pages at build time. Without it, Next.js tries SSR which Pages doesn't support.
- `images.unoptimized: true` — Next.js Image component normally calls `/_next/image` which is a server route. With static export, that route doesn't exist, so images break without this flag.

## Build

```bash
npm run build
```

Output goes to `./out/`. Verify:

```bash
ls out/
# index.html  about.html  _next/  ...
```

## Deploy

### Option A: Wrangler

```bash
npx wrangler pages deploy out --project-name=my-app --branch=main
```

### Option B: GitHub Integration

Build settings:
- **Build command**: `npm run build`
- **Build output directory**: `out`
- **Root directory**: `/` (or `my-app/` if monorepo)
- **Node version**: 20 (set via `NODE_VERSION=20` env var)

Environment variables (if needed):
- `NODE_VERSION=20`

## Tailwind CSS v4 Notes

Tailwind v4 has NO config file. Configuration is in CSS:

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-primary: #00d4ff;
  --color-bg: #0a0a0a;
}
```

**Pitfall**: Don't use `tailwind.config.ts/js` — delete it if it exists.
**Pitfall**: `bg-primary/10` opacity syntax may not work in v4. Use `bg-primary` with explicit alpha:
```css
background: color-mix(in srgb, var(--color-primary) 10%, transparent);
```

## Common Build Errors

### `Another next build process is already running`
```bash
rm .next/build.lock
npm run build
```

### `Image Optimization not supported`
Add `images: { unoptimized: true }` to `next.config.ts`.

### `useState only works in Client Components`
Add `'use client'` at top of file:
```typescript
'use client'
import { useState } from 'react'
```

## Pitfall: Stale Build Cache

If you changed code but `out/` still has old content:
```bash
rm -rf out/ .next/
npm run build
npx wrangler pages deploy out --project-name=my-app --branch=main
```

See [`examples/02-nextjs-static/`](../../../examples/02-nextjs-static/) for full project.

## Next

→ [05. Workers: API Server](../05-worker-api/README.md)
