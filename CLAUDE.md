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
- `server/services/donation.js` — Shared `processDonation()` (upserts donor + donation, sends magic link) used by both webhook and simulation. Also exports `checkBlockedWords()` for custom poll entry validation.
- `server/services/email.js` — Nodemailer magic link sender; called fire-and-forget from the webhook handler.
- `server/middleware/adminAuth.js` — Checks `X-Admin-Key` header against `ADMIN_API_KEY` env var.
- `server/middleware/donorAuth.js` — Resolves `?token=` query param to a `Donor` record; sets `req.donor`.
- `server/middleware/moderatorAuth.js` — Chains `donorAuth` then checks `req.donor.is_moderator`. Moderator access via magic link, no separate API key.
- `server/routes/moderator.js` — Moderator CRUD for polls, rewards, goals, claims, and custom entry approval.

### Moderator Setup

Set `MODERATOR_EMAILS` env var to a comma-separated list of emails. When a donation webhook fires for a matching email, the donor gets `is_moderator: true`. Moderators access their dashboard via their magic link — the Navbar shows a "Moderate" link when `is_moderator` is true. Moderators can CRUD polls/rewards/goals, view/fulfill claims, and approve custom poll entries. They cannot access `/api/admin/*` routes (require `X-Admin-Key`).

### Webhook flow (`server/routes/webhook.js`)

1. HMAC-SHA256 verify (`x-tiltify-signature` + `x-tiltify-timestamp`). Skipped if `TILTIFY_WEBHOOK_SECRET` is unset (useful for local testing).
2. Ack all non-`donation.completed` events with 200.
3. Delegates to `processDonation()` in `server/services/donation.js` — upserts donor (credits balance, extends token TTL without rotating, sets `is_moderator` only when matching), creates donation (P2002 = duplicate → no-op), fire-and-forget sendMagicLink.

### Balance mutations

All balance changes (reward claims, poll votes, goal contributions) use `prisma.$transaction([...])` to keep `Donor.balance_remaining` and the associated record creation atomic.

### Client

- `client/src/api/client.js` — axios instance that auto-attaches `?token=` from `localStorage.donor_token` to every request.
- `client/src/api/admin.js` — separate axios instance that auto-attaches `X-Admin-Key` from `localStorage.admin_key`.
- `client/src/api/moderator.js` — axios instance that auto-attaches `?token=` from `localStorage.donor_token` for moderator routes.
- `client/src/pages/MyWallet.jsx` — reads `?token=` from the URL on mount and persists it to localStorage.
- `client/src/pages/admin/AdminLayout.jsx` — renders a key-entry gate if `localStorage.admin_key` is absent; logout clears the key.

### Database

SQLite via Prisma. All monetary values are **integer cents**. `RewardClaim.claim_data` is a JSON string (SQLite has no native JSON column); routes must `JSON.parse`/`JSON.stringify` it. To migrate to Postgres, change `datasource.provider` and `DATABASE_URL`.

## Environment Variables

| Variable                                      | Purpose                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `TILTIFY_CLIENT_ID` / `TILTIFY_CLIENT_SECRET` | OAuth2 creds for Tiltify v5 API                                   |
| `TILTIFY_CAMPAIGN_ID`                         | Campaign to proxy from Tiltify                                    |
| `TILTIFY_WEBHOOK_SECRET`                      | HMAC secret; omit to disable signature checking locally           |
| `ADMIN_API_KEY`                               | Sent as `X-Admin-Key` from admin UI                               |
| `MODERATOR_EMAILS`                            | Comma-separated emails auto-promoted to moderator on donation     |
| `SMTP_*` / `EMAIL_FROM`                       | Nodemailer config                                                 |
| `APP_BASE_URL`                                | Base URL for magic links in emails (e.g. `http://localhost:5173`) |
| `PORT`                                        | Server port, default `3001`                                       |
| `DATABASE_URL`                                | Prisma DB URL, e.g. `file:./dev.db`                               |

## Local Webhook Testing

```bash
ngrok http 3001
# Register https://<ngrok-url>/api/webhooks/tiltify in Tiltify dashboard
# Omit TILTIFY_WEBHOOK_SECRET during dev to skip signature verification
```

### Simulate Donations (no real money)

**Option A — Admin UI:** Visit `/admin/simulate`, fill in donor email + amount, click "Simulate Donation". Copy the generated magic link to access the donor wallet.

**Option B — curl (full webhook path):** When `TILTIFY_WEBHOOK_SECRET` is unset, HMAC verification is skipped. POST directly:

```bash
curl -X POST http://localhost:3001/api/webhooks/tiltify \
  -H "Content-Type: application/json" \
  -d '{"meta":{"event_type":"donation.completed"},"data":{"id":"test-123","donor_email":"test@example.com","donor_name":"Test","amount":{"value":"10.00"},"comment":"test"}}'
```

**Option C — Admin API:** `POST /api/admin/simulate-donation` with `X-Admin-Key` header:

```bash
curl -X POST http://localhost:3001/api/admin/simulate-donation \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: change-me" \
  -d '{"email":"test@example.com","amount_cents":1000}'
```

Returns `{ success: true, token, donor }`. Use the token to build a magic link: `http://localhost:5173/wallet?token=<token>`.
