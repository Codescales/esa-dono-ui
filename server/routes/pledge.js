import { Router } from 'express';
import { createPledge, createRelayForPledge } from '../services/pledge.js';

const router = Router();

/**
 * POST /api/pledge
 * Create a pending pledge from cart items.
 * Body: { email?, items: [{ kind, target_id, amount_cents?, poll_id?, data? }] }
 * Returns: { pledge_token, total_cents, expires_at, donate_url }
 */
router.post('/', async (req, res) => {
  try {
    const { email, items } = req.body;
    const pledge = await createPledge({ email, items });

    // Create Tiltify relay key for deterministic linkage (graceful fallback)
    const relay = await createRelayForPledge(pledge.pledge_token);

    res.json({
      ...pledge,
      donate_url: relay.donate_url,
      has_relay: !!relay.relay_client_key,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

/**
 * GET /api/pledge/:token
 * Get pledge status (for the return/confirmation page).
 */
router.get('/:token', async (req, res) => {
  try {
    const { default: prisma } = await import('../lib/prisma.js');
    const pledge = await prisma.pendingPledge.findUnique({
      where: { pledge_token: req.params.token },
      include: { items: true },
    });
    if (!pledge) return res.status(404).json({ error: 'Pledge not found' });
    res.json({
      pledge_token: pledge.pledge_token,
      total_cents: pledge.total_cents,
      status: pledge.status,
      donor_email: pledge.donor_email,
      expires_at: pledge.expires_at,
      items: pledge.items.map((i) => ({
        kind: i.kind,
        target_id: i.target_id,
        amount_cents: i.amount_cents,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
