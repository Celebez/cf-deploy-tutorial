# 🔒 Security Policy

## ⚠️ IMPORTANT — JANGAN PERNAH SHARE

| Type | Example | Risk jika leaked |
|---|---|---|
| Cloudflare API Token | `cfut_xxxxxxxx` | Account takeover |
| Cloudflare Account ID | UUID | Targeted attack |
| D1 Database ID | UUID | Data exposure |
| R2 Access Key | `xxxxxxxx` | Storage abuse |
| Workers AI | (no key needed) | Billing spike |
| Wrangler Secret value | JWT signing key | Auth bypass |

> ⚠️ Kalau token kamu leak sekarang → **revoke & rotate** di dashboard Cloudflare. Tidak ada undo.

## 🐛 Report Vulnerability di Repo Ini
1. **JANGAN** buka public issue untuk security bug
2. Email maintainer dengan subject `[SECURITY] cf-deploy-tutorial`
3. Include: deskripsi, reproduction, impact
4. Response dalam 72 jam

## ✅ Repo Ini Aman Karena
- ✅ Tidak ada real token di history
- ✅ `.gitignore` mencegah accidental upload
- ✅ Gitleaks CI scan jalan harian
- ✅ Semua contoh pakai placeholder `YOUR_*_HERE`
- ✅ Tutorial pakai free tier (zero cost risk)

## 🛡️ Untuk User yang Deploy
- Selalu pakai API Token scoped (bukan Global API Key)
- Set token expiration date
- Enable 2FA di Cloudflare account
- Monitor billing alert di dashboard
