# Implementation Review Recommendations

Date: 2026-05-30

## Context

The platform was extended with:

- Custom poll entries with moderator approval
- Global blocked words
- Magic-link moderator role
- Admin donation simulation
- Moderator CRUD pages for polls, rewards, goals, and claims

The implementation builds and the Prisma schema validates, but the review found correctness, security, and operational issues that should be fixed before live use.

---

## Validation Results

Passed:

- `npm run build` succeeds.
- `cd server && DATABASE_URL='file:./dev.db' npx prisma validate` succeeds.
- Custom poll entry happy path works.
- Blocked word whole-word matching works.
- Moderator API scaffolding exists and basic auth works.

---

## Critical Issues

### 1. Duplicate Tiltify webhooks still double-credit donor balance

**File:** `server/services/donation.js`

Current flow:

1. Upsert donor and increment balance.
2. Upsert donation by `tiltify_id`.

If Tiltify retries the same webhook, the unique donation row prevents duplicate donation records, but the donor balance has already been incremented again.

Observed behavior from a script:

```json
{
  "total_donated": 2000,
  "balance_remaining": 2000,
  "donations": 1
}
```

Expected:

```json
{
  "total_donated": 1000,
  "balance_remaining": 1000,
  "donations": 1
}
```

**Recommendation:** make donation processing transactional and let `Donation.tiltify_id` uniqueness gate balance crediting.

Suggested shape:

```js
try {
  const result = await prisma.$transaction(async tx => {
    const donor = await tx.donor.upsert({ ...incrementBalanceAndRotateToken });
    await tx.donation.create({ data: { tiltify_id, donor_id: donor.id, ... } });
    return { donor, token };
  });

  sendMagicLink(email, token).catch(err => console.error('Email error:', err));
  return result;
} catch (e) {
  if (e.code === 'P2002') {
    return { duplicate: true };
  }
  throw e;
}
```

Important: on duplicate `tiltify_id`, do not credit balance, do not rotate token, and do not send another email.

---

### 2. Moderator claims endpoint leaks donor magic tokens

**File:** `server/routes/moderator.js`

Current route includes full donor records:

```js
include: { reward: true, donor: true }
```

That exposes `magic_token`, balances, total donated, token expiry, and moderator state. Exposing `magic_token` lets a moderator impersonate a donor.

**Recommendation:** use a minimal select:

```js
include: {
  reward: true,
  donor: { select: { email: true } },
}
```

Email is probably enough for fulfillment. Avoid exposing any donor token or balance fields to moderators.

---

### 3. Moderator approval route is not state-safe / idempotent

**File:** `server/routes/moderator.js`

Current behavior:

- Approving an already approved entry attempts another `PollOption` create and can throw a unique constraint error.
- Rejecting an approved entry changes entry status to `REJECTED` but leaves the option visible and voteable.
- API allows invalid transitions even if the UI hides buttons.

**Recommendation:** only allow moderation from `PENDING` state:

```js
if (entry.status !== 'PENDING') {
  return res.status(400).json({ error: 'Only pending entries can be moderated' });
}
```

If re-moderation is required later, explicitly model option creation/deletion and vote handling.

---

### 4. Generated artifacts are untracked and `.gitignore` is too sparse

Current `git status` includes generated/dev artifacts:

```txt
?? client/dist/
?? server/prisma/dev.db
?? server/prisma/migrations/
?? .claude/
```

`server/prisma/migrations/` should likely be committed. `client/dist/`, `server/prisma/dev.db`, `.env`, and `.claude/` should not be.

**Recommendation:** update `.gitignore`:

```gitignore
node_modules
.env
client/dist
server/prisma/dev.db
.claude
```

Then keep migrations if this repo tracks Prisma migrations.

---

## Major Issues / Missing Behavior

### 5. Migration may be unsafe for an existing deployed database

The generated migration creates all tables because there were no prior migrations locally. If a real environment already has these tables, applying this migration will fail.

**Recommendation:** confirm deployment status.

- If this repo has no live DB yet, treat current migration as the initial baseline.
- If a DB already exists, baseline the existing schema, then create a true ALTER migration for the new fields/models.

---

### 6. Moderator frontend crashes or behaves badly for non-moderators

**Files:** moderator pages, especially `client/src/pages/moderator/ModeratorDashboard.jsx`

If `/api/moderator/stats` returns 401/403, `stats` remains null, loading becomes false, and render reads `stats.pending_entries`, causing a crash.

**Recommendation:** add error state to moderator pages/layout and show “Moderator access required” or redirect to `/wallet`.

---

### 7. Navbar moderator link may not appear immediately after visiting a magic link

**File:** `client/src/components/Navbar.jsx`

`Navbar` reads `localStorage.donor_token` during render. When `MyWallet.jsx` stores a token from `?token=`, that localStorage update does not force Navbar to re-render.

**Recommendation:** re-check donor state on route changes using `useLocation()`, or introduce a small donor auth context. Minimal fix: add `location` as a dependency and call `getDonor()` when the location changes.

---

### 8. `processDonation()` can demote moderators on future donations

**File:** `server/services/donation.js`

Current update sets:

```js
is_moderator: isModerator
```

If a donor is already a moderator but later removed from `MODERATOR_EMAILS`, their next donation demotes them.

**Recommendation:** decide intended behavior. If moderator status should be durable once granted, only set true when matched:

```js
...(isModerator ? { is_moderator: true } : {})
```

---

### 9. Email normalization is missing

**File:** `server/services/donation.js`

Donors are upserted by raw email. SQLite uniqueness is case-sensitive by default, so `Donor@example.com` and `donor@example.com` can become separate wallets.

**Recommendation:** normalize emails once in `processDonation()`:

```js
const normalizedEmail = email.trim().toLowerCase();
```

Use the normalized value for donor upsert, moderator checks, and email sending.

---

## Medium Issues / Improvements

### 10. Simulation route accepts loosely typed `amount_cents`

**File:** `server/routes/admin.js`

Current check relies on JavaScript coercion:

```js
if (!email || !amount_cents || amount_cents < 100)
```

**Recommendation:** parse and validate integer cents explicitly:

```js
const cents = Number(amount_cents);
if (!email || !Number.isInteger(cents) || cents < 100) {
  return res.status(400).json({ error: 'email and integer amount_cents (min 100) required' });
}
```

Apply the same pattern to new endpoints where practical.

---

### 11. Blocked words UI/API allows phrases, but checker supports only single words

Admin can add `"bad word"`, but the checker tokenizes submitted text into individual words and compares each token to dictionary entries. A phrase entry will never match.

**Recommendation:** either enforce single-word blocked entries in the API, or support phrase matching. Given the requirement says “blocked words dictionary,” single-word enforcement is likely enough.

---

### 12. Blocked word checker is ASCII-oriented

Current regex:

```js
/\b\w+\b/g
```

This may not behave well for accented characters or non-English scripts.

**Recommendation:** acceptable for first pass, but consider Unicode-aware tokenization if needed for international moderation.

---

### 13. SMTP unconfigured causes noisy connection errors in local dev

Simulation and webhook testing trigger SMTP connection attempts to localhost:587 when SMTP is not configured.

**Recommendation:** in `sendMagicLink()`, if `SMTP_HOST` is unset, log the magic link and return without sending:

```js
if (!process.env.SMTP_HOST) {
  console.log(`Magic link for ${email}: ${url}`);
  return;
}
```

---

### 14. Moderator and admin CRUD logic is duplicated

`server/routes/admin.js` and `server/routes/moderator.js` duplicate substantial CRUD logic.

**Recommendation:** acceptable for prototype, but extract shared services/helpers later for rewards, polls, goals, and claims.

---

## Positive Findings

The implementation successfully added the requested feature structure:

- Plan written to `PLAN.md`.
- Shared donation processing exists.
- Donation simulation endpoint/UI exists.
- Blocked words endpoint/UI exists.
- Custom poll entry submission works.
- Moderator approval works on happy path.
- Approved custom entries become normal voteable `PollOption`s.
- Moderator route group and UI pages exist.
- Client build passes.
- Prisma schema validates.

---

## Recommended Fix Order

1. Fix `processDonation()` idempotency to prevent duplicate webhook double-crediting.
2. Restrict moderator claim donor payload to avoid leaking magic tokens.
3. Make custom entry moderation state-safe.
4. Add `.gitignore` entries and remove generated artifacts from the working tree.
5. Add moderator UI error handling/access gate.
6. Fix Navbar moderator link refresh behavior.
7. Normalize donor emails.
8. Tighten validation on new endpoints.

The first four should be completed before live testing with real Tiltify webhooks.
