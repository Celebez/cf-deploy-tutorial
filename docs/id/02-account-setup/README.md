# 02 — Setup Akun Cloudflare

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/02-account-setup/README.md)

## Langkah 1: Buat Akun

1. Buka https://dash.cloudflare.com/sign-up
2. Verifikasi email
3. Selesai — tidak butuh kartu kredit untuk free tier

## Langkah 2: Dapatkan Account ID

```bash
# Install Wrangler (CLI Cloudflare)
npm install -g wrangler

# Login
wrangler login
# Browser terbuka → Authorize

# Cek Account ID
wrangler whoami
# Output: Account ID: 0123456789abcdef...
```

Simpan Account ID — kamu butuh ini untuk `wrangler.toml` dan panggilan API.

## Langkah 3: Buat API Token (Disarankan)

**Jangan pakai Global API Key**. Buat token dengan scope spesifik:

1. Buka https://dash.cloudflare.com/profile/api-tokens
2. Klik "Create Token"
3. Pakai template "Edit Cloudflare Pages" atau "Edit Cloudflare Workers"
4. Atau custom permission:

```bash
curl -s -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "X-Auth-Email: your@email.com" \
  -H "X-Auth-Key: your-global-key" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "Deploy Token",
    "policies": [{
      "effect": "allow",
      "resources": {"com.cloudflare.api.account.<YOUR_ACCOUNT_ID>": "*"},
      "permission_groups": [
        {"id": "8d28297797f24fb8a0c332fe0866ec89"},
        {"id": "e247aedd66bd41cc9193af0213416666"},
        {"id": "968749a9f34041cf88ad0e29c86e6f96"}
      ]
    }]
  }'
```

Simpan token `cfut_...` yang dikembalikan — kamu akan pakai ini sebagai `CLOUDFLARE_API_TOKEN`.

**Permission Group IDs untuk Pages:**
- `8d28297797f24fb8a0c332fe0866ec89` — Pages Write
- `e247aedd66bd41cc9193af0213416666` — Pages Read
- `968749a9f34041cf88ad0e29c86e6f96` — Pages Metadata Read

## Langkah 4: Set Environment Variables

```bash
export CLOUDFLARE_API_TOKEN="cfut_token_kamu"
export CLOUDFLARE_ACCOUNT_ID="account_id_kamu"

# Tambahkan ke ~/.bashrc atau ~/.zshrc agar persistent
echo 'export CLOUDFLARE_API_TOKEN="cfut_..."' >> ~/.bashrc
echo 'export CLOUDFLARE_ACCOUNT_ID="..."' >> ~/.bashrc
```

## Langkah 5: Verifikasi

```bash
curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.success'
# → true
```

## Lanjut

→ [03. Pages: Static Site (HTML)](../03-pages-static/README.md)
