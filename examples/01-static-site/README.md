# Example 01 — Static HTML Site

> 🇬🇧 Minimal static HTML/CSS/JS deploy to Cloudflare Pages. See [docs/en/03](../../docs/en/03-pages-static/README.md) | 🇮🇩 Lihat [docs/id/03](../../docs/id/03-pages-static/README.md)

## Deploy

```bash
cd examples/01-static-site
npx wrangler pages deploy public --project-name=cf-static-demo --branch=main
```

URL: `https://cf-static-demo.pages.dev`

## Structure

```
01-static-site/
├── public/
│   ├── index.html      # Main page
│   ├── style.css       # Dark theme
│   └── script.js       # Fetch demo
└── README.md
```

No build step. No dependencies. Deploys in <5 seconds.
