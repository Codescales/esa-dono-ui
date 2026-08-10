# PRD: Migrate Payment Processing from Tiltify to Stripe

Triage: `ready-for-agent`
Related: `docs/adr/0002-migrate-payments-tiltify-to-stripe.md`,
handoff `/tmp/opencode/handoff-tiltify-stripe-migration.md`

## Problem Statement

Donors currently give through Tiltify. The platform proxies the Tiltify API, redirects
donors to a Tiltify-hosted donate page, and links donations back to a donor's smart
donation cart (pledge) using Tiltify webhook relay keys. This ties the donation
experience, campaign totals, and physical-reward shipping to Tiltify, and it means
donor shipping information for physical rewards is handled outside a payment provider the
team wants to standardise on. The team wants to process payments through Stripe, own the
checkout experience, and hold as little donor PII as possible — while still letting
donors build a pledge cart, leave a comment, claim physical rewards, and optionally cover
shipping.

## Solution

Replace Tiltify with Stripe using hosted Checkout Sessions. A donor builds a pledge cart
as today, optionally leaves a comment, and is redirected to a Stripe-hosted checkout for a
fixed amount equal to their pledge total. On completion, a verified Stripe webhook credits
the donor's wallet and fulfils the pledge exactly as before. Campaign totals are computed
from the platform's own donation records instead of the Tiltify API.

For physical rewards, a checkout is always required so Stripe can collect and validate a
shipping address, which is stored on a per-donor Stripe Customer — never in the platform
database. When a physical reward is funded from wallet balance, its item is represented as
a fully-discounted ($0) Stripe line item purely to trigger address collection. Shipping is
charged at claim time as a flat rate based on the reward's size (small/medium/large), with
a per-item override for oversized items, and only when the donor has opted in via a
donor-level "cover shipping" preference that is disclosed before checkout. The reward
always ships regardless of coverage. The shop fulfils physical rewards by reading purchased
items and shipping details directly from Stripe.

## User Stories

1. As a donor, I want to be redirected to a secure Stripe-hosted checkout, so that I never
   enter card details inside the platform.
2. As a donor, I want to pay an amount equal to my pledge total, so that my selected
   incentives are covered deterministically.
3. As a donor, I want my completed payment to credit my wallet balance, so that I can spend
   it on rewards, poll votes, and goals.
4. As a donor, I want my pledge to be fulfilled automatically after payment, so that my
   chosen incentives are applied without extra steps.
5. As a donor, I want to leave a comment (up to 500 characters) before checkout, so that my
   message is recorded with my donation.
6. As a donor, I want blocked words in my comment to be rejected before payment, so that my
   comment complies with moderation rules.
7. As a donor, I want to be returned to a confirmation page after paying, so that I can see
   my pledge status.
8. As a donor, I want to cancel checkout and return to the platform, so that I am not
   charged if I change my mind.
9. As a returning donor, I want my existing magic-link wallet access to keep working, so
   that the payment change does not disrupt my account.
10. As a moderator, I want to keep managing polls, rewards, goals, and claims, so that the
    payment migration does not affect moderation workflows.
11. As a visitor, I want the home page to show the amount raised and the goal, so that I can
    see campaign progress.
12. As an operator, I want campaign totals derived from actual donations, so that totals do
    not depend on an external API.
13. As an admin, I want to simulate a donation without real money, so that I can test the
    end-to-end flow.
14. As an operator, I want donation processing to be idempotent per Stripe payment, so that
    duplicate webhook deliveries never double-credit a donor.
15. As an operator, I want inbound webhooks cryptographically verified, so that only genuine
    Stripe events are processed.
16. As a developer, I want signature verification to be skippable locally when no signing
    secret is set, so that I can test without live Stripe credentials.
17. As a donor claiming a physical reward, I want to complete a checkout, so that Stripe can
    collect and validate my shipping address.
18. As a donor, I want my shipping address stored by Stripe rather than the platform, so
    that the platform holds minimal PII about me.
19. As a donor who already funded a physical reward from wallet balance, I want the item to
    appear as a $0 line at checkout, so that I provide an address without being charged
    again for the item.
20. As a donor, I want a donor-level preference to cover shipping costs, so that I can
    choose to pay shipping as a gesture of support.
21. As a donor, I want my current shipping-coverage preference shown before I complete
    checkout, so that I can change it before paying.
22. As a donor, I want shipping charged at a flat rate based on the item's size, so that the
    shipping cost is predictable.
23. As a donor, I want oversized items to use a specific shipping cost override, so that
    unusually large items are priced correctly.
24. As a donor, I want my physical reward to ship even if I decline to cover shipping, so
    that declining coverage never blocks fulfilment.
25. As a shop operator, I want to read purchased physical items and shipping details from
    Stripe, so that I can fulfil rewards without platform-side address data.
26. As a moderator/admin managing rewards, I want physical rewards to sync automatically to
    Stripe products, so that the shop can identify what was purchased.
27. As an operator, I want a per-donor Stripe Customer created and reused, so that a donor's
    validated address is retained across multiple physical claims.
28. As an operator, I want the migration to remove Tiltify entirely, so that there is a
    single payment provider and no dead code paths.

## Implementation Decisions

Follows `docs/adr/0002-migrate-payments-tiltify-to-stripe.md`. Delivered in two phases.

**Phase 1 — Core payment cutover**

- **Stripe service module.** Wraps the Stripe SDK behind a narrow interface:
  `createCheckoutSession({ pledgeToken, amountCents, email? }) → { id, url }` and
  `verifyWebhook(rawBody, signature) → event`. Checkout runs in payment mode, a single
  fixed line item equal to the pledge total, currency from configuration (default usd),
  with the pledge token carried in session metadata and client reference for linkage, plus
  success and cancel URLs back to the app.
- **Pledge → checkout linkage.** The former Tiltify relay-key creation is replaced by a
  `createCheckoutForPledge` operation that produces the Stripe checkout URL and persists a
  checkout session identifier and checkout URL on the pending pledge.
- **Comment capture.** Pledge creation accepts and validates a comment (max 500 chars, run
  through the existing blocked-words check, rejecting with a client error on a match),
  persists it on the pending pledge, and carries it onto the donation at fulfilment. Comments
  are NOT collected on Stripe's page.
- **Webhook.** Mounted at a Stripe-specific path with the raw body preserved ahead of JSON
  parsing. Events are verified via the Stripe SDK; when no signing secret is configured,
  verification is skipped (local/test escape hatch). Only the checkout-completed event is
  processed; it is mapped to a normalized donation (external id = session id, pledge token
  from metadata/client reference, email from customer details, amount from the session
  total) and delegated to the shared donation processor.
- **Donation processor.** Unchanged in behaviour; the external identifier field and
  parameter are renamed from the Tiltify-specific name to a provider-neutral external id.
  Idempotency is enforced by a unique constraint on that identifier.
- **Campaign totals.** A campaign-summary operation computes amount raised from the sum of
  donation amounts and reads the goal from configuration, replacing the Tiltify campaign
  fetch. The static donate-URL endpoint is removed; direct-donate links point to the cart
  flow.
- **Schema (rename migration; no production data).** Donation external identifier renamed to
  a neutral unique column; pending-pledge relay fields renamed to checkout session id and
  checkout URL; a comment column added to the pending pledge.
- **Shared types.** Tiltify webhook payload types replaced by the minimal Stripe
  checkout-session shape actually consumed; the normalized-donation type uses the neutral
  external id.
- **Configuration.** Tiltify variables removed; Stripe secret key, Stripe webhook signing
  secret, currency, and campaign goal added.
- **Client.** A 500-char comment field added to the donate flow; checkout copy made
  provider-neutral; the pledge response linkage flag renamed; direct-donate links repointed
  to the cart flow; the pledge-return page serves as the Stripe success landing.

**Phase 2 — Physical items and Stripe-owned shipping (follow-up)**

- **Shipping pricing module.** Resolves a Stripe shipping rate from a reward's size
  (small/medium/large), or from a per-item override amount when set. Pure and independently
  testable.
- **Stripe catalog sync module.** On reward create/update, upserts a corresponding Stripe
  product/price and stores their identifiers on the reward; archives on deactivation. Enables
  the shop to enumerate purchased physical items from Stripe.
- **Physical-claim checkout.** Claiming a physical reward always creates a checkout that
  collects a shipping address (item discounted to $0 when wallet-funded) attached to the
  donor's Stripe Customer; when the donor's cover-shipping preference is on, the size-based
  (or override) shipping rate is attached as a paid shipping option.
- **Stripe Customer module.** Ensures a reused per-donor Stripe Customer that holds the
  validated address.
- **Donor preference.** A forward-only donor-level cover-shipping boolean, editable in the
  wallet/profile area and disclosed before checkout; it never retroactively affects completed
  claims.
- **Schema (Phase 2).** Donor gains a Stripe customer id and cover-shipping flag; reward
  gains a size, an optional shipping-cost override, and Stripe product/price identifiers; the
  reward claim gains a checkout session id and drops stored address fields for physical
  rewards.
- **PII posture.** The platform stores no shipping address; addresses live on Stripe and are
  read by the shop from Stripe.

## Testing Decisions

Good tests assert externally observable behaviour through a module's public interface, not
its internals. They avoid asserting on Stripe SDK call shapes or private helpers, and remain
valid if the implementation changes while behaviour does not.

Modules to test (confirmed scope):

- **Webhook verification / dispatch** — behavioural: a validly signed checkout-completed
  event results in donation processing and a 200; a bad/missing signature is rejected; the
  unset-secret path skips verification. Prior art: the existing Tiltify webhook test suite,
  adapted to generate Stripe signatures via the SDK's test-header helper.
- **Donation processing** — behavioural idempotency: duplicate external ids do not
  double-credit and report a duplicate; a first event credits balance and records the
  donation. Prior art: the existing donation-service tests, updated to the neutral external
  id.
- **Pledge + comment** — behavioural: pledges persist a valid comment and carry it to the
  donation on fulfilment; over-length or blocked-word comments are rejected. Prior art: the
  existing pledge-service tests.
- **Campaign totals** — behavioural: amount raised reflects the sum of recorded donations
  and the configured goal is returned. Prior art: the existing campaign route test, replacing
  the Tiltify service mock with donation fixtures.
- **Shipping pricing (Phase 2)** — pure-function behaviour: each size maps to its expected
  rate and an override takes precedence. New tests; the purest deep module to cover first.

Stripe-API-side-effect-heavy modules (catalog sync, physical-claim checkout, Stripe Customer)
are exercised through their behavioural seams rather than by deep SDK mocking.

## Out of Scope

- Physical-reward fulfilment, shipping-label generation, and address display within the
  platform — owned by the shop, read from Stripe.
- Storing or reading shipping addresses in the platform database or UI.
- Bulk/bundled shipping discounts and end-of-event shipping settlement (explicitly dropped;
  shipping is a flat per-claim charge by size).
- A dual-provider abstraction or any ability to keep running Tiltify alongside Stripe.
- Migration of production data (none exists).
- Embedded card entry (Payment Element) or Payment Links.
- Collecting donor comments through Stripe's checkout page.

## Further Notes

- **Spike required before committing the discount mechanism:** confirm Stripe permits a
  fully-discounted 0-total Checkout Session with shipping-address collection (the
  declined-shipping, wallet-funded case). Fallback: setup mode or a nominal charge.
- **Verification:** typecheck, unit tests, and the container smoke test must pass; the smoke
  test's simulated donation must be updated to post a Stripe-shaped signed webhook.
- **Sequencing:** Phase 1 (core cutover) lands and goes green before Phase 2 (physical
  shipping) begins.
- **Secrets:** the Stripe secret key and webhook signing secret must never be committed; the
  example env holds empty placeholders only.
