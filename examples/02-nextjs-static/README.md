# Example 02 — Next.js Static Export

> Next.js 15 dengan Tailwind v4 di-deploy sebagai static ke Cloudflare Pages. Lihat [docs/en/04](../../docs/en/04-pages-nextjs/README.md) | 🇮🇩 [docs/id/04](../../docs/id/04-pages-nextjs/README.md)

## Setup (Fresh)

```bash
cd examples/02-nextjs-static
npm install
npm run build
npx wrangler pages deploy out --project-name=cf-nextjs-demo --branch=main
```

URL: `https://cf-nextjs-demo.pages.dev`

## Key Files

### `next.config.ts`
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};
export default nextConfig;
```

### `app/page.tsx`
Landing page demo dengan Tailwind v4.

### `app/globals.css`
```css
@import "tailwindcss";
@theme {
  --color-primary: #00d4ff;
  --color-bg: #0a0a0a;
}
```

## Deploy Workflow

```bash
# 1. Clean previous build
rm -rf .next out/

# 2. Build
npm run build

# 3. Verify output
ls out/

# 4. Deploy
npx wrangler pages deploy out --project-name=cf-nextjs-demo --branch=main
```

## Pitfalls

❌ Build cache stale: `rm -rf .next out/`
❌ Lupa `images.unoptimized`: gambar 404
❌ Pakai `tailwind.config.ts` di v4: hapus file itu
