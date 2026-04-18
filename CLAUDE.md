# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (root, installs all workspaces)
npm install

# Run dev (server :3001 + client :5173 via concurrently)
npm run dev

# Build client only
npm run build

# DB migrations (run from server/)
cd server && npx prisma migrate dev --name <name>
cd server && npx prisma generate

# DB studio
cd server && npx prisma studio
```

No test runner is configured.

## Bootstrap

```bash
cp .env.example .env   # fill in values
cd server && npx prisma migrate dev --name init && npx prisma generate && cd ..
npm run dev
```

## Architecture

npm workspaces monorepo: `server/` (Express + Prisma + SQLite) and `client/` (React + Vite + Tailwind). In dev, Vite proxies all `/api` requests to `localhost:3001` (`client/vite.config.js`).

### Server

- `server/index.js` — Express entry point. The Tiltify webhook route **must** be mounted before `express.json()` because it needs the raw body buffer for HMAC verification.
- `server/lib/prisma.js` — Prisma singleton using `globalThis` cache to survive hot reloads.
- `server/services/tiltify.js` — OAuth2 client-credentials token fetch with in-memory cache (refreshed ~60s before expiry). Calls Tiltify v5 API.
- `server/services/email.js` — Nodemailer magic link sender; called fire-and-forget from the webhook handler.
- `server/middleware/adminAuth.js` — Checks `X-Admin-Key` header against `ADMIN_API_KEY` env var.
- `server/middleware/donorAuth.js` — Resolves `?token=` query param to a `Donor` record; sets `req.donor`.

### Webhook flow (`server/routes/webhook.js`)

1. HMAC-SHA256 verify (`x-tiltify-signature` + `x-tiltify-timestamp`). Skipped if `TILTIFY_WEBHOOK_SECRET` is unset (useful for local testing).
2. Ack all non-`donation.completed` events with 200.
3. `prisma.donor.upsert` by email — credits `balance_remaining` and rotates `magic_token` (30-day TTL).
4. `prisma.donation.upsert` by `tiltify_id` — idempotency guard against duplicate deliveries.
5. Fire-and-forget `sendMagicLink`.

### Balance mutations

All balance changes (reward claims, poll votes, goal contributions) use `prisma.$transaction([...])` to keep `Donor.balance_remaining` and the associated record creation atomic.

### Client

- `client/src/api/client.js` — axios instance that auto-attaches `?token=` from `localStorage.donor_token` to every request.
- `client/src/api/admin.js` — separate axios instance that auto-attaches `X-Admin-Key` from `localStorage.admin_key`.
- `client/src/pages/MyWallet.jsx` — reads `?token=` from the URL on mount and persists it to localStorage.
- `client/src/pages/admin/AdminLayout.jsx` — renders a key-entry gate if `localStorage.admin_key` is absent; logout clears the key.

### Database

SQLite via Prisma. All monetary values are **integer cents**. `RewardClaim.claim_data` is a JSON string (SQLite has no native JSON column); routes must `JSON.parse`/`JSON.stringify` it. To migrate to Postgres, change `datasource.provider` and `DATABASE_URL`.

## Environment Variables

| Variable | Purpose |
|---|---|
| `TILTIFY_CLIENT_ID` / `TILTIFY_CLIENT_SECRET` | OAuth2 creds for Tiltify v5 API |
| `TILTIFY_CAMPAIGN_ID` | Campaign to proxy from Tiltify |
| `TILTIFY_WEBHOOK_SECRET` | HMAC secret; omit to disable signature checking locally |
| `ADMIN_API_KEY` | Sent as `X-Admin-Key` from admin UI |
| `SMTP_*` / `EMAIL_FROM` | Nodemailer config |
| `APP_BASE_URL` | Base URL for magic links in emails (e.g. `http://localhost:5173`) |
| `PORT` | Server port, default `3001` |
| `DATABASE_URL` | Prisma DB URL, e.g. `file:./dev.db` |

## Local Webhook Testing

```bash
ngrok http 3001
# Register https://<ngrok-url>/api/webhooks/tiltify in Tiltify dashboard
# Omit TILTIFY_WEBHOOK_SECRET during dev to skip signature verification
```
