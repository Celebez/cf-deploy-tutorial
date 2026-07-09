# 10 — Custom Domain + DNS

> 🇮🇩 Bahasa Indonesia | 🇬🇧 [English](../../en/10-custom-domain/README.md)

Mapping custom domain untuk project `*.pages.dev`. Cloudflare handle SSL otomatis.

## Prasyarat

- Domain sudah ditambah ke Cloudflare (free tier cukup)
- Zone aktif (nameserver sudah diubah di registrar)
- Status domain = `active` di Cloudflare

## Langkah 1: Verifikasi Zone Aktif

```bash
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" | jq '{status: .result.status, name_servers: .result.name_servers}'
```

Jika `status: "pending"`, nameserver belum diubah di registrar.

## Langkah 2: Tambah Domain ke Project Pages

### Via Dashboard
1. Pages → project-kamu → "Custom domains" → "Set up a custom domain"
2. Masukkan `example.com` (apex) atau `app.example.com` (subdomain)
3. Klik "Activate domain"
4. Cloudflare otomatis membuat DNS record

### Via API

```python
import urllib.request, json, os

account_id = os.environ['CLOUDFLARE_ACCOUNT_ID']
project = 'my-site'
domain = 'example.com'
token = os.environ['CLOUDFLARE_API_TOKEN']

url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/domains"
data = json.dumps({"name": domain}).encode()
req = urllib.request.Request(url, data=data, method="POST", headers={
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
})
print(json.loads(urllib.request.urlopen(req).read()))
```

## Langkah 3: Konfigurasi DNS

Cloudflare otomatis membuat CNAME, tapi jika kamu ingin manual:

### Domain Apex (`example.com`)

```bash
# Pertama: HAPUS record A/AAAA yang ada untuk apex
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY"

# Lalu: BUAT CNAME (Cloudflare support CNAME flattening di apex)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "@",
    "content": "my-site.pages.dev",
    "proxied": true
  }'
```

⚠️ **Pitfall**: Pakai `"name": "@"` untuk apex, BUKAN prefix domain.
⚠️ **Pitfall**: CNAME apex butuh Cloudflare proxy (proxied: true) agar flattening jalan.

### Subdomain (`app.example.com`)

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "app",
    "content": "my-site.pages.dev",
    "proxied": true
  }'
```

### Subdomain `www`

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "www",
    "content": "my-site.pages.dev",
    "proxied": true
  }'
```

## Langkah 4: Verifikasi

```bash
# DNS
dig @1.1.1.1 example.com A +short
# → 104.21.x.x atau 172.67.x.x (IP proxy Cloudflare)

dig @1.1.1.1 www.example.com CNAME +short
# → my-site.pages.dev

# HTTP
curl -I https://example.com
# → 200 OK, server: cloudflare
```

## Progres Status Domain

```
initializing → pending → active
```

SSL cert otomatis diterbitkan oleh Google Trust Services dalam ~2 menit setelah `active`.

## Pitfall yang Umum

❌ **Status stuck di `pending`**:
- Cek record A/AAAA konflik (harus dihapus sebelum CNAME)
- Cek zone sudah `active` (nameserver diubah)
- DNS cache (tunggu 5 menit, atau `dig @1.1.1.1 ...`)

❌ **404 setelah deploy**:
- Custom domain menunjuk ke project Pages LAMA — re-add ke project sekarang
- DNS masih cached — flush cache lokal atau tunggu

❌ **SSL error**:
- Tunggu 5-10 menit untuk provisioning
- Jangan pakai record CAA yang block `letsencrypt.org` atau `pki.goog`

✅ **Pakai `proxied: true`** untuk CDN + DDoS protection.

## Pindah Domain Antar Project

```bash
# 1. Hapus dari project lama
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/OLD_PROJECT/domains/example.com" \
  -H "Authorization: Bearer $TOKEN"

# 2. Tambah ke project baru
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/NEW_PROJECT/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "example.com"}'
```

DNS record tetap sama.

## Lanjut

→ [11. Deploy via Wrangler & API](../11-deploy/README.md)
