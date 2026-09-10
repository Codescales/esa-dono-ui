/**
 * Types for inbound Stripe checkout session webhook events. These describe
 * external JSON that is hand-parsed in server/routes/webhook.ts, so every field
 * is optional and must be narrowed at runtime.
 */

export interface StripeCustomerDetails {
  email?: string;
  name?: string;
}

export interface StripeCheckoutSession {
  id: string;
  amount_total?: number;
  customer_email?: string;
  customer_details?: StripeCustomerDetails;
  metadata?: Record<string, string> | null;
  client_reference_id?: string | null;
  payment_status?: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data?: { object?: StripeCheckoutSession };
}

/** Normalized donation extracted from a webhook payload. */
export interface NormalizedDonation {
  externalId: string;
  email: string;
  donorName: string;
  amountCents: number;
  comment: string | null;
  pledgeToken: string | null;
}
