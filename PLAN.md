# Plan: Dono-UI Donation Platform

## Context
Build a greenfield Node.js + React donation platform integrated with Tiltify. Tiltify handles all payment processing; this app receives donation events via webhook, credits donor balances, and lets donors spend those balances on rewards, polls, and pooled fund goals. No user accounts — donors are identified by email and access their wallet via a magic link token emailed after each donation.

**User choices:**
- Auth: Anonymous (magic token via email)
- Admin: Full CRUD UI at `/admin`, protected by API key
- Rewards: Digital codes, physical items (with address collection), shoutouts, character selection, game difficulty (CUSTOM type)
- Polls: Donation-weighted ($1 = 1 vote)

---

## Tech Stack
- **Frontend**: React 18 + Vite 5, TailwindCSS 3, React Router v6
- **Backend**: Node.js + Express 4, ESM (`"type": "module"`)
- **Database**: SQLite via Prisma ORM (all monetary values in integer cents)
- **Email**: Nodemailer (configurable SMTP)
- **Monorepo**: npm workspaces (`client/`, `server/`)
- **Concurrency**: `concurrently` for dev

---

## Environment Variables (`.env.example`)
```
TILTIFY_CLIENT_ID=
TILTIFY_CLIENT_SECRET=
TILTIFY_CAMPAIGN_ID=
TILTIFY_WEBHOOK_SECRET=
ADMIN_API_KEY=change-me
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Donation Platform <no-reply@example.com>"
APP_BASE_URL=http://localhost:5173
PORT=3001
DATABASE_URL="file:./dev.db"
```

---

## Database Models (`server/prisma/schema.prisma`)
- **Donor** — `email` (unique), `total_donated`, `balance_remaining`, `magic_token` (unique), `token_expires_at`
- **Donation** — `tiltify_id` (unique), `donor_id`, `amount_cents`, `donor_name`, `comment`
- **Reward** — `title`, `description`, `type` (DIGITAL|PHYSICAL|SHOUTOUT|CUSTOM), `cost_cents`, `quantity_total` (nullable=unlimited), `quantity_claimed`, `is_active`, `custom_type_label`
- **RewardClaim** — `reward_id`, `donor_id`, `status` (PENDING|FULFILLED), `claim_data` (JSON string: address/preferences)
- **Poll** — `title`, `description`, `is_active`, `ends_at`, `total_votes_cents`
- **PollOption** — `poll_id`, `label`, `votes_cents`
- **PollVote** — `poll_id`, `poll_option_id`, `donor_id`, `amount_cents`
- **FundGoal** — `title`, `description`, `target_cents`, `current_cents`, `is_active`, `is_complete`
- **FundContribution** — `goal_id`, `donor_id`, `amount_cents`

---

## Project Structure
```
dono-ui/
├── package.json              # root workspace + concurrently dev script
├── .env / .env.example
├── server/
│   ├── package.json
│   ├── index.js              # Express app, middleware order (webhook raw BEFORE json)
│   ├── lib/prisma.js         # Prisma singleton (globalThis cache for hot reload)
│   ├── prisma/schema.prisma
│   ├── services/
│   │   ├── tiltify.js        # OAuth2 token cache + getCampaign/getDonations
│   │   └── email.js          # Nodemailer sendMagicLink()
│   ├── middleware/
│   │   ├── adminAuth.js      # X-Admin-Key header check
│   │   └── donorAuth.js      # ?token= query param → req.donor
│   └── routes/
│       ├── webhook.js        # POST /api/webhooks/tiltify (raw body, HMAC verify)
│       ├── campaign.js       # GET /api/campaign (proxies Tiltify)
│       ├── donor.js          # GET /api/donor (donorAuth)
│       ├── rewards.js        # GET /api/rewards, POST /api/rewards/:id/claim
│       ├── polls.js          # GET /api/polls, POST /api/polls/:id/vote
│       ├── goals.js          # GET /api/goals, POST /api/goals/:id/contribute
│       └── admin.js          # All CRUD under /api/admin/* (adminAuth)
└── client/
    ├── package.json
    ├── vite.config.js        # proxy /api → localhost:3001
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── index.css          # @tailwind base/components/utilities
        ├── App.jsx            # React Router: admin nested routes + public routes w/ Navbar
        ├── api/
        │   ├── client.js      # axios instance, auto-attach donor token from localStorage
        │   ├── campaign.js
        │   ├── donor.js
        │   ├── rewards.js
        │   ├── polls.js
        │   ├── goals.js
        │   └── admin.js       # admin axios instance, auto-attach X-Admin-Key
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Card.jsx
        │   ├── Modal.jsx
        │   ├── ProgressBar.jsx
        │   └── LoadingSpinner.jsx
        └── pages/
            ├── Home.jsx           # Campaign name/desc, ProgressBar for raised/goal
            ├── MyWallet.jsx       # Read ?token=, store localStorage, show balance + claims
            ├── Rewards.jsx        # List rewards, claim modal (conditional fields by type)
            ├── Polls.jsx          # List polls, vote bars, vote modal (option + amount)
            ├── Goals.jsx          # List goals, ProgressBar, contribute modal
            └── admin/
                ├── AdminLayout.jsx    # API key login gate + sidebar nav
                ├── AdminDashboard.jsx # Stats summary
                ├── AdminRewards.jsx   # Full CRUD table + create/edit modal
                ├── AdminPolls.jsx     # Full CRUD + options management
                ├── AdminGoals.jsx     # Full CRUD + progress display
                └── AdminDonations.jsx # Donations list + Claims table with FULFILLED toggle
```

---

## Critical Implementation Details

### 1. Webhook Raw Body (server/index.js)
```js
// MUST mount webhook route BEFORE express.json()
app.use('/api/webhooks/tiltify', express.raw({ type: 'application/json' }), webhookRouter);
app.use(express.json()); // all other routes
```

### 2. Webhook Flow (server/routes/webhook.js)
1. Verify HMAC-SHA256 signature (`crypto.timingSafeEqual`)
2. Parse raw body JSON
3. Filter to `donation.completed` events only (ack all others with 200)
4. `prisma.donor.upsert` by email → credit balance + set new magic token (30-day TTL)
5. `prisma.donation.upsert` by `tiltify_id` (idempotency)
6. Fire-and-forget `sendMagicLink(email, token)`

### 3. All Balance Mutations Use Prisma Transactions
```js
await prisma.$transaction([
  prisma.donor.update({ where: { id }, data: { balance_remaining: { decrement: amount } } }),
  prisma.rewardClaim.create({ data: { ... } }),
  prisma.reward.update({ where: { id }, data: { quantity_claimed: { increment: 1 } } }),
]);
```

### 4. Tiltify OAuth2 (server/services/tiltify.js)
- POST to `https://v5api.tiltify.com/oauth/token` with client credentials
- Cache token until ~60s before expiry
- GET `https://v5api.tiltify.com/api/public/campaigns/{CAMPAIGN_ID}`

### 5. Donor Token Flow (client)
- `MyWallet.jsx` reads `?token=` from URL → stores in `localStorage`
- `api/client.js` interceptor auto-appends `?token=` to all requests

### 6. Reward Claim Validation by Type
- `PHYSICAL` → require `name`, `address`, `city`, `country` in `claim_data`
- `DIGITAL` → no extra data needed (code sent by admin later)
- `SHOUTOUT` → optional `message` field
- `CUSTOM` → free-form field, label from `custom_type_label`

### 7. Admin Auth
- Store API key in `localStorage.admin_key`
- `api/admin.js` axios interceptor sends as `X-Admin-Key` header
- `AdminLayout.jsx` shows login form if key not set; logout clears key

---

## Bootstrap Commands
```bash
cd /home/bongo/projects/esa/dono-ui
npm install
cp .env.example .env   # fill in values
cd server && npx prisma migrate dev --name init && npx prisma generate && cd ..
npm run dev            # starts server on :3001, client on :5173
```

## Local Tiltify Webhook Testing
```bash
ngrok http 3001
# Register https://<ngrok-url>/api/webhooks/tiltify in Tiltify dashboard
# Set TILTIFY_WEBHOOK_SECRET to the generated secret
```

## Verification Checklist
- [ ] `GET http://localhost:3001/api/health` returns `{"ok":true}`
- [ ] `GET http://localhost:5173` shows Home page with campaign data
- [ ] POST test webhook payload to `/api/webhooks/tiltify` → donor created in DB, email sent
- [ ] Visit magic link → MyWallet shows balance
- [ ] Claim reward → balance decremented, claim appears in admin
- [ ] Vote on poll → option vote bar updates
- [ ] Contribute to goal → progress bar advances
- [ ] Admin CRUD for all entity types works
- [ ] Duplicate webhook (same `tiltify_id`) does not double-credit balance

---

## Architectural Notes
- **Token rotation**: each new donation replaces the donor's magic token (most recent link valid)
- **SQLite is sufficient** for a charity streaming campaign; migrate to Postgres by changing `datasource.provider` + `DATABASE_URL`
- **No cron job** by default; add `server/jobs/syncDonations.js` with `setInterval` as a self-healing fallback if needed
- **claim_data** is stored as a JSON string (SQLite has no native JSON type); routes must `JSON.parse`/`JSON.stringify`
