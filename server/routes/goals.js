import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { donorAuth } from '../middleware/donorAuth.js';

const router = Router();

router.get('/', async (req, res) => {
  const goals = await prisma.fundGoal.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
  });
  res.json(goals);
});

router.post('/:id/contribute', donorAuth, async (req, res) => {
  const { amount_cents } = req.body;
  if (!amount_cents || amount_cents < 100) {
    return res.status(400).json({ error: 'amount_cents (min 100) required' });
  }

  const goal = await prisma.fundGoal.findUnique({ where: { id: req.params.id } });
  if (!goal || !goal.is_active || goal.is_complete) {
    return res.status(404).json({ error: 'Goal not found, inactive, or complete' });
  }

  const donor = req.donor;
  if (donor.balance_remaining < amount_cents) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const newTotal = goal.current_cents + amount_cents;
  const isComplete = newTotal >= goal.target_cents;

  await prisma.$transaction([
    prisma.donor.update({
      where: { id: donor.id },
      data: { balance_remaining: { decrement: amount_cents } },
    }),
    prisma.fundContribution.create({
      data: {
        goal_id: goal.id,
        donor_id: donor.id,
        amount_cents,
      },
    }),
    prisma.fundGoal.update({
      where: { id: goal.id },
      data: {
        current_cents: { increment: amount_cents },
        is_complete: isComplete,
      },
    }),
  ]);

  res.json({ success: true });
});

export default router;
