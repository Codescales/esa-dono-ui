import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { donorAuth } from '../middleware/donorAuth.js';
import { spendLimit } from '../middleware/rateLimit.js';
import { contributeGoalTx } from '../services/spend.js';

const router = Router();

router.get('/', async (req, res) => {
  const goals = await prisma.fundGoal.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'desc' },
  });
  res.json(goals);
});

router.post('/:id/contribute', spendLimit, donorAuth, async (req, res) => {
  try {
    const { amount_cents } = req.body;
    await prisma.$transaction(async (tx) => {
      await contributeGoalTx(tx, req.donor.id, req.params.id, Number(amount_cents));
    });
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

export default router;
