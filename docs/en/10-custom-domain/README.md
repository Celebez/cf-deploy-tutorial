# 10 — Custom Domain + DNS

> 🇬🇧 English | 🇮🇩 [Bahasa Indonesia](../../id/10-custom-domain/README.md)

Custom domain mapping for `*.pages.dev` projects. Cloudflare handles SSL automatically.

## Prerequisites

- Domain already added to Cloudflare (free tier OK)
- Active zone (nameservers changed at registrar)
- Domain status = `active` in Cloudflare

## Step 1: Verify Zone Active

```bash
curl -s "https://api.cloudflare.com/client/v4/zones/ZONE_ID" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" | jq '{status: .result.status, name_servers: .result.name_servers}'
```

If `status: "pending"`, nameservers haven't been updated at registrar yet.

## Step 2: Add Domain to Pages Project

### Via Dashboard
1. Pages → your-project → "Custom domains" → "Set up a custom domain"
2. Enter `example.com` (apex) or `app.example.com` (subdomain)
3. Click "Activate domain"
4. Cloudflare auto-creates DNS records

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

## Step 3: DNS Configuration

Cloudflare auto-creates CNAME, but if you do it manually:

### Apex Domain (`example.com`)

```bash
# First: DELETE any existing A/AAAA records for the apex
curl -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY"

# Then: CREATE CNAME (Cloudflare supports CNAME flattening on apex)
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

⚠️ **Pitfall**: Use `"name": "@"` for apex, NOT the domain prefix.
⚠️ **Pitfall**: Apex CNAME requires Cloudflare proxy (proxied: true) for flattening to work.

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

### `www` Subdomain

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

## Step 4: Verify

```bash
# DNS
dig @1.1.1.1 example.com A +short
# → 104.21.x.x or 172.67.x.x (Cloudflare proxy IPs)

dig @1.1.1.1 www.example.com CNAME +short
# → my-site.pages.dev

# HTTP
curl -I https://example.com
# → 200 OK, server: cloudflare
```

## Domain Status Progression

```
initializing → pending → active
```

SSL cert is auto-issued by Google Trust Services within ~2 minutes of `active`.

## Common Pitfalls

❌ **Status stuck on `pending`**:
- Check for conflicting A/AAAA records (must delete before CNAME)
- Check zone is `active` (nameservers changed)
- DNS cache (wait 5 min, or `dig @1.1.1.1 ...`)

❌ **404 after deploy**:
- Custom domain points to OLD Pages project — re-add to current project
- DNS still cached — flush local cache or wait

❌ **SSL error**:
- Wait 5-10 minutes for provisioning
- Don't use CAA records blocking `letsencrypt.org` or `pki.goog`

✅ **Use `proxied: true`** for CDN + DDoS protection.

## Switching Domains Between Projects

```bash
# 1. Delete from old project
curl -X DELETE "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/OLD_PROJECT/domains/example.com" \
  -H "Authorization: Bearer $TOKEN"

# 2. Add to new project
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/NEW_PROJECT/domains" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"name": "example.com"}'
```

DNS record stays the same.

## Next

→ [11. Deploy via Wrangler & API](../11-deploy/README.md)
