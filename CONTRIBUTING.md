# Contributing to cf-deploy-tutorial

## 🌍 Bilingual Contributions
Kami menerima kontribusi dalam **English** dan **Bahasa Indonesia**.
When adding new content, add to **BOTH** `docs/en/` and `docs/id/`. Mirror rule applies.

## 📋 How to Contribute

### 🐛 Report Bug → Issue dengan template `bug_report.md`
### 💡 Suggest Feature → Template `feature_request.md`
### 🔒 Security Issue → Email langsung (lihat SECURITY.md)
### ✏️ Edit/Add Tutorial:
1. Fork repo ini
2. Branch: `git checkout -b feat/nama-topik`
3. Edit/add di `docs/en/` DAN `docs/id/` (paritas!)
4. Commit: `git commit -m "feat: tambah tutorial X"`
5. Push & buka PR

## ✅ Standards

| Aspek | Standard |
|---|---|
| Bahasa | EN + ID (mirror) |
| Style | Beginner-friendly, jelas, contoh runnable |
| Code | Tested lokal sebelum submit |
| Secrets | JANGAN commit API key/token/secret |
| Examples | Gunakan dummy data, bukan production |

## 🔒 Security for Contributors
**JANGAN PERNAH** commit:
- Real API keys (Cloudflare, OpenAI, dll)
- Real Account ID / Zone ID production
- Real domain name asli
- Wrangler secrets values

Gunakan placeholder di example:
```toml
# wrangler.toml
name = "my-project"  # GANTI dengan nama kamu
account_id = "YOUR_ACCOUNT_ID_HERE"  # Get dari dashboard
```

## 💡 Topic Ideas
- Astro / SvelteKit / Nuxt deployment
- Cloudflare Stream (video)
- Cloudflare Images
- Workers Analytics Engine
- Workflows (orchestration)
- Vectorize (vector DB)
- Hyperdrive (Postgres connection)
