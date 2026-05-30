# Independent Implementation Review

## Confirmed Issues

1. **Duplicate webhooks double-credit donor balance** (`server/services/donation.js`, lines 20–49). The donor upsert increments `total_donated` and `balance_remaining` before the donation upsert. Because only the donation row is unique by `tiltify_id`, a Tiltify retry increments the donor balance again while silently no-oping the donation record.

2. **Moderator claims leak donor magic tokens** (`server/routes/moderator.js`, line 164). The GET `/claims` endpoint uses `include: { reward: true, donor: true }`, exposing the full `Donor` record—including `magic_token`, `token_expires_at`, and balances—to any authenticated moderator. The PATCH `/claims/:id` endpoint (line 176) repeats the same leak.

3. **Custom entry moderation is not state-safe** (`server/routes/moderator.js`, lines 116–141). The PATCH handler for `/polls/custom-entries/:id` never verifies `entry.status === 'PENDING'`. Re-approving an already approved entry attempts another `PollOption` create and can throw a P2002 unique-constraint error. Rejecting an approved entry changes the entry status without deleting or disabling the associated `PollOption`, leaving a orphaned, voteable option in the poll.

4. **`.gitignore` is too sparse** (repo root). It only ignores `node_modules`. `git status` shows untracked `client/dist/`, `server/prisma/dev.db`, `.claude/`, and `.env`. The Prisma baseline migration under `server/prisma/migrations/` should be committed; the rest should be ignored.

5. **Migration is a full baseline, not an ALTER** (`server/prisma/migrations/20260530153245_add_custom_entries/migration.sql`). The migration creates every table from scratch. If this is applied to an existing deployed database that already contains these tables, it will fail.

6. **Moderator UI crashes on 401/403** (`client/src/pages/moderator/ModeratorDashboard.jsx`, lines 9–20). The fetch promise only uses `.finally(() => setLoading(false))`. If the request is rejected (non-moderator, expired token, etc.), `stats` remains `null` and the render immediately dereferences `stats.pending_entries`, throwing a runtime TypeError. `ModeratorClaims.jsx` uses the same anti-pattern.

7. **Donation processing can demote existing moderators** (`server/services/donation.js`, line 25). The donor upsert unconditionally sets `is_moderator: isModerator`. If a donor was previously promoted but their email is later removed from `MODERATOR_EMAILS`, their next donation revokes moderator status.

8. **Email normalization is missing** (`server/services/donation.js`, lines 24–25). The moderator check lowercases the email, but the Prisma upsert uses the raw `email` parameter. SQLite’s default collation is case-sensitive for uniqueness, so `Donor@example.com` and `donor@example.com` can become separate wallets.

9. **Simulation route accepts loosely typed `amount_cents`** (`server/routes/admin.js`, line 96). The check `!amount_cents || amount_cents < 100` relies on JavaScript coercion. A string value such as `"abc"` is truthy and evaluates `"abc" < 100` as `false` (NaN comparison), so it passes validation.

10. **Blocked words API allows phrases the checker cannot match** (`server/services/donation.js`, `checkBlockedWords`). The regex `/\b\w+\b/g` tokenizes text into single ASCII words. An admin can add a multi-word phrase like `"bad word"`, but the checker will never match it because it compares individual tokens against the dictionary.

11. **SMTP misconfiguration causes noisy connection errors** (`server/services/email.js`). A transporter is instantiated at module load with `host: undefined` when `SMTP_HOST` is unset. Every webhook or simulation triggers a connection attempt that fails instead of degrading gracefully.

## Disputed or Needs Clarification

- **Navbar moderator link refresh** (`client/src/components/Navbar.jsx`, lines 10–13). The recommendation states that storing a token in `MyWallet.jsx` does not force Navbar re-render. In practice, React Router navigation causes the layout to re-render, `token` is re-read from `localStorage`, and the `useEffect` dependency on `token` should trigger `getDonor()`. The symptom as described is not clearly reproducible. However, the proposed minimal fix—adding a `useLocation()` dependency—is still valid for keeping donor state fresh across route changes (e.g., after server-side promotion/demotion without a token change), so it is worth applying for robustness rather than the stated bug.

- **Duplicated admin/moderator CRUD** (`server/routes/admin.js` vs `server/routes/moderator.js`). The review flags this as an issue but immediately marks it "acceptable for prototype." It is architectural debt, not a functional bug, and does not need to block live testing.

## Additional Issues Found

- **Admin claims endpoint also leaks donor magic tokens** (`server/routes/admin.js`, lines 37–38 and 48–49). Both GET and PATCH `/claims` include `donor: true`, returning the full donor record. This is lower severity than the moderator leak because the admin route is already protected by `X-Admin-Key`, but it is still unnecessary exposure.

- **Poll vote endpoint repeats loose `amount_cents` validation** (`server/routes/polls.js`, line 73). The same coercion bug as the admin simulation exists here: `!amount_cents || amount_cents < 100` allows non-numeric strings through.

- **Unhandled `JSON.parse` crashes in claims mapping** (`server/routes/admin.js` and `server/routes/moderator.js`). Both routes map over claims and call `JSON.parse(c.claim_data)` without a try-catch. Because SQLite stores `claim_data` as a plain text column, a malformed value will throw an unhandled exception and return 500.

- **Missing `APP_BASE_URL` fallback in magic links** (`server/services/email.js`, line 4). If the environment variable is unset, magic links are constructed as `undefined/wallet?token=...`, producing broken URLs.

## Recommended Patch Sequence

1. **Idempotency fix**: Wrap `processDonation` in a Prisma interactive transaction that creates the donation row (not upsert) and rolls back the donor balance increment on duplicate `tiltify_id` (P2002). Return early on duplicate; do not send email.
2. **Token leak fix**: Change moderator claims GET and PATCH to `include: { reward: true, donor: { select: { email: true } } }`.
3. **State-safe moderation**: Guard the custom entry PATCH so it only acts when `status === 'PENDING'`. Decide whether rejecting an approved entry should also delete its `PollOption`.
4. **Repo hygiene**: Add `.env`, `client/dist`, `server/prisma/dev.db`, and `.claude/` to `.gitignore`; commit the baseline migration.
5. **Moderator UI resilience**: Add an error state to `ModeratorDashboard.jsx` (and sibling pages) that renders an access-denied message or redirects on 401/403 instead of crashing.
6. **Email normalization**: Trim and lowercase the email once at the top of `processDonation`; use the normalized value for upsert, moderator checks, and email sending.
7. **Input validation**: Parse and explicitly validate `amount_cents` as an integer in `admin.js` simulate-donation and `polls.js` vote endpoints.
8. **SMTP guard**: In `sendMagicLink`, skip sending and log the link when `SMTP_HOST` is missing; add a fallback for missing `APP_BASE_URL`.
