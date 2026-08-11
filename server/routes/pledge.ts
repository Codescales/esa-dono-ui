import { Router, type Request, type Response } from 'express';
import { createPledge, createCheckoutForPledge } from '../services/pledge.js';

const router = Router();

/**
 * POST /api/pledge
 * Create a pending pledge from cart items.
 * Body: { email?, comment?, items: [{ kind, target_id, amount_cents?, poll_id?, data? }] }
 * Returns: { pledge_token, total_cents, expires_at, donate_url, has_checkout }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, comment, items } = req.body;
    const pledge = await createPledge({ email, comment, items });

    // Create Stripe Checkout Session for deterministic linkage (graceful fallback)
    let checkout: {
      donate_url: string | null;
      checkout_session_id: string | null;
    } = {
      donate_url: null,
      checkout_session_id: null,
    };
    try {
      checkout = await createCheckoutForPledge(pledge.pledge_token);
    } catch (checkoutErr) {
      console.error('Checkout session creation failed (non-fatal):', checkoutErr);
    }

    res.json({
      ...pledge,
      donate_url: checkout.donate_url,
      has_checkout: !!checkout.checkout_session_id,
    });
  } catch (err) {
    const status = (err as { status?: number }).status || 500;
    res.status(status).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/pledge/:token
 * Get pledge status (for the return/confirmation page).
 */
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { default: prisma } = await import('../lib/prisma.js');
    const pledge = await prisma.pendingPledge.findUnique({
      where: { pledge_token: req.params.token },
      include: { items: true, fulfilled_by: { include: { donor: true } } },
    });
    if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
    res.json({
      pledge_token: pledge.pledge_token,
      total_cents: pledge.total_cents,
      top_up_cents: pledge.top_up_cents,
      status: pledge.status,
      donor_email: pledge.donor_email,
      expires_at: pledge.expires_at,
      magic_token:
        pledge.status === 'FULFILLED' ? (pledge.fulfilled_by?.donor?.magic_token ?? null) : null,
      items: pledge.items.map((i) => ({
        kind: i.kind,
        target_id: i.target_id,
        amount_cents: i.amount_cents,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
