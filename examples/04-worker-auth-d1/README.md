# Example 04 — Worker + D1 Auth

> Full auth API: register, login, JWT, admin panel. Lihat [docs/en/06](../../docs/en/06-worker-d1/README.md) | 🇮🇩 [docs/id/06](../../docs/id/06-worker-d1/README.md)

## Setup

```bash
cd examples/04-worker-auth-d1
npm install
npx wrangler d1 create cf-auth-demo-db
# Copy database_id ke wrangler.toml

npx wrangler d1 execute cf-auth-demo-db --local --file=./schema.sql
npx wrangler d1 execute cf-auth-demo-db --remote --file=./schema.sql

echo "your-32-byte-random-secret" | npx wrangler secret put JWT_SECRET
# Optional:
echo "0x4AAAAAAA..." | npx wrangler secret put TURNSTILE_SECRET

npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Routes

| Method | Path | Body | Auth | Deskripsi |
|---|---|---|---|---|
| POST | `/api/register` | `{email, password}` | - | Register user |
| POST | `/api/login` | `{email, password}` | - | Login → JWT |
| GET | `/api/me` | - | Bearer | Current user |
| GET | `/api/admin/users` | - | Bearer + admin | List all users |
| POST | `/api/admin/users/:id/approve` | - | Bearer + admin | Approve user |

## Test

```bash
# Register
curl -X POST http://localhost:8787/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# Login
TOKEN=$(curl -s -X POST http://localhost:8787/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}' | jq -r .token)

# Get me
curl http://localhost:8787/api/me \
  -H "Authorization: Bearer $TOKEN"
```

## Make First Admin

```bash
npx wrangler d1 execute cf-auth-demo-db --remote \
  --command="UPDATE users SET is_admin = 1, approved = 1 WHERE email = 'alice@example.com'"
```
