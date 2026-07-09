# 02 — Cloudflare Account Setup

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/02-account-setup/README.md)

## Step 1: Create Account

1. Go to https://dash.cloudflare.com/sign-up
2. Verify email
3. You're in — no credit card required for free tier

## Step 2: Get Your Account ID

```bash
# Install Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login
wrangler login
# Browser opens → Authorize

# Get Account ID
wrangler whoami
# Output: Account ID: 0123456789abcdef...
```

Save this Account ID — you need it for `wrangler.toml` and API calls.

## Step 3: Create API Token (Recommended)

**Don't use Global API Key**. Create a scoped token instead:

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Use template "Edit Cloudflare Pages" or "Edit Cloudflare Workers"
4. Or customize permissions:

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

Save the returned `cfut_...` token — you'll use it as `CLOUDFLARE_API_TOKEN`.

**Permission Group IDs for Pages:**
- `8d28297797f24fb8a0c332fe0866ec89` — Pages Write
- `e247aedd66bd41cc9193af0213416666` — Pages Read
- `968749a9f34041cf88ad0e29c86e6f96` — Pages Metadata Read

## Step 4: Set Environment Variables

```bash
export CLOUDFLARE_API_TOKEN="cfut_your_token_here"
export CLOUDFLARE_ACCOUNT_ID="your_account_id_here"

# Add to ~/.bashrc or ~/.zshrc to persist
echo 'export CLOUDFLARE_API_TOKEN="cfut_..."' >> ~/.bashrc
echo 'export CLOUDFLARE_ACCOUNT_ID="..."' >> ~/.bashrc
```

## Step 5: Verify

```bash
curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq '.success'
# → true
```

## 📘 Detail Lengkap: API Token & Global API Key

Lihat [**api-auth.md**](./api-auth.md) untuk tutorial komprehensif:
- Step-by-step ambil API Token (recommended)
- Step-by-step ambil Global API Key (legacy)
- Permission IDs lengkap untuk custom token
- Contoh kode Python/Node/bash pakai token vs key
- Security best practices & rotation guide

## Next

→ [03. Pages: Static Site (HTML)](../03-pages-static/README.md)
