import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const signature = req.headers['x-tiltify-signature'];
    const timestamp = req.headers['x-tiltify-timestamp'];
    const rawBody = req.body; // Buffer from express.raw()

    if (process.env.TILTIFY_WEBHOOK_SECRET) {
      if (!signature || !timestamp) {
        return res.status(400).json({ error: 'Missing signature headers' });
      }
      const message = timestamp + '.' + rawBody.toString();
      const expectedSig = crypto
        .createHmac('sha256', process.env.TILTIFY_WEBHOOK_SECRET)
        .update(message)
        .digest('hex');
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSig);
      if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payload = JSON.parse(rawBody.toString());

    // Acknowledge non-donation events
    if (payload.meta?.event_type !== 'donation.completed' && payload.type !== 'donation.completed') {
      return res.status(200).json({ received: true });
    }

    const donation = payload.data ?? payload.donation ?? payload;
    const tiltifyId = donation.id?.toString() ?? donation.legacy_id?.toString();
    const email = donation.donor_email ?? donation.campaign_donation?.donor?.email;
    const donorName = donation.donor_name ?? donation.campaign_donation?.donor?.name ?? 'Anonymous';
    const amountCents = Math.round(
      parseFloat(donation.amount?.value ?? donation.amount ?? 0) * 100
    );
    const comment = donation.comment ?? donation.campaign_donation?.comment ?? null;

    if (!email || !tiltifyId) {
      return res.status(200).json({ received: true, skipped: 'missing email or id' });
    }

    // Delegate to shared donation processor
    const { processDonation } = await import('../services/donation.js');
    await processDonation({
      tiltifyId,
      email,
      donorName,
      amountCents,
      comment,
    });

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
