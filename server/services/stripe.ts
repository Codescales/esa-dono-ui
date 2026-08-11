import Stripe from 'stripe';

/**
 * Stripe service. Wraps the Stripe SDK behind a narrow, stable interface so the
 * rest of the app does not depend on SDK details. Falls back to a degraded (no-op)
 * mode when STRIPE_SECRET_KEY is unset, so local dev and tests run without Stripe.
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export interface CreateCheckoutOptions {
  pledgeToken: string;
  amountCents: number;
  email?: string | null;
}

export interface CreateCheckoutResult {
  id: string;
  url: string | null;
}

/**
 * Create a hosted Checkout Session for a pledge.
 * The pledge token is carried in client_reference_id and metadata for
 * deterministic linkage on the completed webhook.
 */
export async function createCheckoutSession({
  pledgeToken,
  amountCents,
  email,
}: CreateCheckoutOptions): Promise<CreateCheckoutResult> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  const currency = process.env.STRIPE_CURRENCY || 'usd';
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: 'Donation' },
        },
      },
    ],
    client_reference_id: pledgeToken,
    metadata: { pledge_token: pledgeToken },
    customer_email: email || undefined,
    success_url: `${baseUrl}/pledge/${pledgeToken}`,
    cancel_url: `${baseUrl}/pledge/${pledgeToken}`,
  });

  return { id: session.id, url: session.url };
}

/**
 * Verify an inbound Stripe webhook signature. Returns the parsed event.
 * When STRIPE_WEBHOOK_SECRET is unset, verification is skipped and the raw body
 * is parsed directly (local/test escape hatch).
 */
export async function verifyWebhook(
  rawBody: Buffer,
  signature: string | string[] | undefined,
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();
  if (secret && stripe) {
    return stripe.webhooks.constructEvent(
      rawBody,
      typeof signature === 'string' ? signature : '',
      secret,
    );
  }
  return JSON.parse(rawBody.toString()) as Stripe.Event;
}

/**
 * True when Stripe is configured (a secret key is present). Used to decide
 * whether a checkout flow can proceed or must degrade.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
