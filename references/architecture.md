# Architecture Diagrams

## High-Level Architecture

```
                                ┌─────────────────────┐
                                │  Cloudflare Global  │
                                │   Edge Network      │
                                │  (300+ POPs)        │
                                └──────────┬──────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
        ┌───────▼────────┐         ┌───────▼────────┐         ┌───────▼────────┐
        │  Pages Project │         │ Worker Project │         │ Worker Project │
        │  (static site) │◄────────┤  (API/SSR)     │◄────────┤  (AI/LLM)      │
        └────────────────┘         └───────┬────────┘         └────────────────┘
                                           │
                ┌──────────────────────────┼──────────────────────────┐
                │                          │                          │
        ┌───────▼────────┐         ┌───────▼────────┐         ┌───────▼────────┐
        │      D1        │         │      KV        │         │      R2        │
        │  (SQLite)      │         │ (Key-Value)    │         │  (S3-compat)   │
        └────────────────┘         └────────────────┘         └────────────────┘
```

## Request Flow

```
1. User (Jakarta) → DNS resolve → Edge POP terdekat
2. Edge POP: ada cache? → Serve cached HTML
                  │
                  └─► Forward ke Pages origin
                          │
                          └─► Pages return static files
                                  │
                                  └─► Browser fetch /api/* ke Worker
                                          │
                                          └─► Worker: read D1/KV/R2/AI
                                                  │
                                                  └─► Response JSON
```

## Auth Flow (Example 04)

```
1. User POST /api/register { email, password, turnstileToken }
2. Worker: verify Turnstile token
3. Worker: PBKDF2 hash password + random salt
4. Worker: INSERT INTO users (D1)
5. Response: 201 { user_id, approved: false }

6. Admin POST /api/admin/users/:id/approve
7. Worker: verify JWT + admin role
8. Worker: UPDATE users SET approved = 1
9. Response: 200 OK

10. User POST /api/login { email, password }
11. Worker: SELECT user, verify password hash
12. Worker: check approved = 1
13. Worker: sign JWT (7 days)
14. Response: 200 { token, user }

15. User GET /api/me with Authorization: Bearer <jwt>
16. Worker: verify JWT signature
17. Worker: SELECT user
18. Response: 200 { id, email, admin }
```

## Bindings Data Flow

```
HTTP Request
     │
     ▼
  Worker Runtime
     │
     ├──► env.DB.prepare(...).bind(...).first()      → D1 (SQLite, 10ms)
     │
     ├──► env.CACHE.get(key, 'json')                 → KV (<5ms, eventual)
     │
     ├──► env.STORAGE.put(key, data)                 → R2 (50ms, S3 API)
     │
     ├──► env.AI.run('@cf/meta/llama-3.2-3b', ...)   → GPU inference
     │
     └──► env.COUNTER.idFromName('user').fetch(...)  → Durable Object
                                                          (single-instance, strong)
```
