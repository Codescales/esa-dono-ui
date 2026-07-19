import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { donorAuth } from '../middleware/donorAuth.js';
import { spendLimit } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', async (req, res) => {
  const rewards = await prisma.reward.findMany({
    where: { is_active: true },
    orderBy: { cost_cents: 'asc' },
  });
  res.json(rewards);
});

router.post('/:id/claim', spendLimit, donorAuth, async (req, res) => {
  const reward = await prisma.reward.findUnique({ where: { id: req.params.id } });
  if (!reward || !reward.is_active) return res.status(404).json({ error: 'Reward not found' });

  // Check quantity
  if (reward.quantity_total !== null && reward.quantity_claimed >= reward.quantity_total) {
    return res.status(400).json({ error: 'Reward sold out' });
  }

  const donor = req.donor;
  if (donor.balance_remaining < reward.cost_cents) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Validate claim_data by type
  const claimData = req.body.claim_data ?? {};
  if (reward.type === 'PHYSICAL') {
    const { name, address, city, country } = claimData;
    if (!name || !address || !city || !country) {
      return res
        .status(400)
        .json({ error: 'Physical rewards require name, address, city, country' });
    }
  }

  await prisma.$transaction([
    prisma.donor.update({
      where: { id: donor.id },
      data: { balance_remaining: { decrement: reward.cost_cents } },
    }),
    prisma.rewardClaim.create({
      data: {
        reward_id: reward.id,
        donor_id: donor.id,
        claim_data: JSON.stringify(claimData),
        status: 'PENDING',
      },
    }),
    prisma.reward.update({
      where: { id: reward.id },
      data: { quantity_claimed: { increment: 1 } },
    }),
  ]);

  res.json({ success: true });
});

export default router;
