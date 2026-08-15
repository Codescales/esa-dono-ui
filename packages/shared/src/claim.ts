/** Reward claim data is arbitrary user-supplied JSON, persisted as a string. */
export type ClaimData = Record<string, unknown>;

/**
 * Shipping address for a PHYSICAL reward, collected by Stripe Checkout and
 * merged into the reward's claim_data. Mirrors the fields required by
 * claimRewardTx (name, address, city, country).
 */
export interface ShippingAddress {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
}

export function parseClaimData(raw: string | null | undefined): ClaimData | null {
  return raw ? (JSON.parse(raw) as ClaimData) : null;
}

export function stringifyClaimData(data: ClaimData): string {
  return JSON.stringify(data);
}
