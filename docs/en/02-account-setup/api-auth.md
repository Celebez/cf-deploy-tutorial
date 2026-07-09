# 02b — API Token & Global API Key: Cara Ambil & Bedanya

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/02-account-setup/api-auth.md)

Cloudflare punya **2 cara autentikasi** yang berbeda. Pilih sesuai use case:

| | **API Token** (Recommended) | **Global API Key** |
|---|---|---|
| Scope | Terbatas (per resource) | Full account access |
| Bisa expire? | ✅ Ya (pilih tanggal) | ❌ Tidak |
| Bisa limit per permission? | ✅ Ya | ❌ Tidak |
| Risk jika leak | ✅ Terbatas | ❌ Full account takeover |
| Format | `cfut_xxxxxxxx` | `cfk_xxxxxxxx` atau hex 37 char |
| Wrangler support | ✅ Yes | ❌ Wrangler v4+ requires token |
| Hapus sendiri? | ✅ Self-revoke di dashboard | ❌ Harus regenerate |

**Default: pakai API Token.**

---

## Cara 1: Ambil API Token (Recommended)

### Step 1: Buka Dashboard

https://dash.cloudflare.com/profile/api-tokens

Klik **Create Token**.

### Step 2: Pilih Template atau Custom

**Pakai template** (paling cepat):
- "Edit Cloudflare Pages" — untuk deploy Pages
- "Edit Cloudflare Workers" — untuk deploy Workers
- "Read all resources" — untuk script read-only

**Custom** (lebih spesifik):

Klik "Create Custom Token" → "Get started".

### Step 3: Pilih Permissions

Untuk **Pages + Workers full deploy**, butuh permission ini:

| Permission | Access | Untuk |
|---|---|---|
| Account > Pages | Edit | Deploy & manage Pages |
| Account > Workers Scripts | Edit | Deploy Workers |
| Account > Workers KV Storage | Edit | KV namespace CRUD |
| Account > Workers D1 | Edit | D1 database CRUD |
| Account > Workers R2 Storage | Edit | R2 bucket CRUD |
| Account > Account Settings | Read | Verifikasi akun |
| Zone > DNS | Edit | Setup custom domain (kalau pakai zone yang sudah ada) |
| Zone > Zone | Read | List zone kamu |

### Step 4: Pilih Account Resources

Di section "Account Resources", pilih:
- **Include > Specific account > [Akun kamu]**

Untuk Zone (kalau pakai DNS):
- **Include > Specific zone > example.com**

### Step 5: Set TTL & IP Filter (Optional tapi Disarankan)

- **Time To Live (TTL)**: berapa lama token hidup. Pilih **1 tahun** max untuk production.
- **IP Filtering**: kalau token kamu hanya dipakai dari server tertentu, tambahkan IP server.

### Step 6: Lanjut ke Summary

Klik "Continue to summary" → review → "Create Token".

**Token hanya ditampilkan SEKALI.** Copy dan simpan di password manager.

Format: `cfut_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 7: Test Token

```bash
export CLOUDFLARE_API_TOKEN="cfut_your_token_here"

# Test basic auth
curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq .

# Should show: success: true, your email, country, etc.
```

---

## Cara 2: Ambil Global API Key (Legacy)

⚠️ **Hanya pakai ini jika**:
- Token di atas tidak jalan (rare)
- Butuh akses yang tidak ada di permission group Token
- Legacy script/CI lama

### Step 1: Buka Dashboard

https://dash.cloudflare.com/profile/api-tokens

Scroll ke bagian **"API Keys"** (bawah halaman, beda section dari Tokens).

### Step 2: Klik "View" di Global API Key

Cloudflare akan minta password akun + (jika aktif) 2FA code.

### Step 3: Copy Key

Format: hex string 37 char (contoh: `a1b2c3d4e5f6...`)

### Step 4: Test

```bash
export CF_EMAIL="you@example.com"
export CF_KEY="your_global_api_key"

curl -s "https://api.cloudflare.com/client/v4/user" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_KEY" | jq .
```

---

## Mana yang Dipakai untuk Apa?

| Use Case | Pakai | Catatan |
|---|---|---|
| Wrangler CLI | **Token** | `wrangler login` atau env var `CLOUDFLARE_API_TOKEN` |
| GitHub Actions CI/CD | **Token** | Set sebagai secret `CLOUDFLARE_API_TOKEN` |
| Local script (Python/Node) | **Token** | Bearer auth header |
| Bash `curl` Zona DNS legacy | **Global Key** | X-Auth-Email + X-Auth-Key headers |
| Cloudflare Dashboard | (login biasa) | Username + password |

---

## Pemakaian dalam Kode

### Python dengan Token

```python
import urllib.request, json, os

TOKEN = os.environ['CLOUDFLARE_API_TOKEN']
ACCOUNT_ID = os.environ['CLOUDFLARE_ACCOUNT_ID']

def cf_api(path: str, method='GET', body=None):
    url = f"https://api.cloudflare.com/client/v4/{path}"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# List Pages projects
projects = cf_api(f"accounts/{ACCOUNT_ID}/pages/projects")
for p in projects['result']:
    print(p['name'], '→', p.get('subdomain'))
```

### Python dengan Global Key

```python
import urllib.request, json, os

EMAIL = os.environ['CF_EMAIL']
KEY = os.environ['CF_KEY']
ZONE_ID = os.environ['ZONE_ID']

def cf_api(path: str, method='GET', body=None):
    url = f"https://api.cloudflare.com/client/v4/{path}"
    headers = {
        "X-Auth-Email": EMAIL,
        "X-Auth-Key": KEY,
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# List DNS records
records = cf_api(f"zones/{ZONE_ID}/dns_records")
for r in records['result']:
    print(r['type'], r['name'], '→', r['content'])
```

### Node.js / TypeScript dengan Token

```typescript
const TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;

async function cfApi(path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return await res.json();
}

const projects = await cfApi(`accounts/${ACCOUNT_ID}/pages/projects`);
console.log(projects.result);
```

### curl one-liner

```bash
# With Token
curl "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" | jq .

# With Global Key
curl "https://api.cloudflare.com/client/v4/user" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_KEY" | jq .
```

---

## Security Best Practices

✅ **DO:**
- Pakai API Token scoped, bukan Global Key
- Set TTL pendek (max 1 tahun) untuk token
- Pakai IP filtering kalau deploy dari server tertentu
- Simpan di password manager / secret manager (GitHub Secrets, 1Password, Bitwarden)
- **Rotate** token tiap 6-12 bulan
- Monitor token usage di dashboard (Account > Audit Log)

❌ **DON'T:**
- Commit token ke Git (gunakan `.gitignore` + secret scanner)
- Share via Slack/Discord/email
- Pakai Global Key kalau Token cukup
- Pakai token production di laptop dev

---

## Pemulihan

### Kalau Global Key Leak

⚠️ Tidak bisa di-revoke, hanya bisa di-regenerate:
1. https://dash.cloudflare.com/profile/api-tokens → "API Keys" section
2. Klik "Roll" di sebelah Global API Key
3. Update semua script yang pakai key lama
4. Cek audit log untuk akses mencurigakan

### Kalau API Token Leak

✅ Bisa di-revoke tanpa ganti key:
1. https://dash.cloudflare.com/profile/api-tokens
2. Find token → klik "Roll" atau "Delete"
3. Generate token baru
4. Update semua deployment

Token yang di-revoke langsung tidak valid — semua script yang pakai akan gagal 401.

---

## Audit & Monitor

### Cek Token Usage

https://dash.cloudflare.com/?to=/:account/audit-log

Lihat event:
- "API token authenticated" → semua request pakai token
- Filter by token name → hanya request token tertentu

### Rate Limit

Token punya limit per scope. Kalau hit limit:
- Tunggu 1 menit (limit reset)
- Atau pakai token kedua (split load)

---

## Contoh Automation: Buat Token via API

Untuk CI/CD atau multi-environment:

```bash
# scripts/create_token.sh (sudah ada di repo)
bash scripts/create_token.sh <global-api-key> <email> <account-id>
```

Atau langsung:

```bash
curl -X POST "https://api.cloudflare.com/client/v4/user/tokens" \
  -H "X-Auth-Email: $CF_EMAIL" \
  -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "CI Deploy Token",
    "expires_on": "2027-01-01T00:00:00Z",
    "policies": [{
      "effect": "allow",
      "resources": {
        "com.cloudflare.api.account.<ACCOUNT_ID>": "*"
      },
      "permission_groups": [
        {"id": "8d28297797f24fb8a0c332fe0866ec89"},
        {"id": "e247aedd66bd41cc9193af0213416666"},
        {"id": "968749a9f34041cf88ad0e29c86e6f96"}
      ]
    }]
  }'
```

---

## Lanjut

→ [03. Pages: Static Site (HTML)](../03-pages-static/README.md)
