import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { adminAuth } from '../middleware/adminAuth.js';
import { processDonation } from '../services/donation.js';

const router = Router();
router.use(adminAuth);

// Stats
router.get('/stats', async (req, res) => {
  const [donorCount, donationCount, claimCount, totalRaised] = await Promise.all([
    prisma.donor.count(),
    prisma.donation.count(),
    prisma.rewardClaim.count(),
    prisma.donation.aggregate({ _sum: { amount_cents: true } }),
  ]);
  res.json({
    donors: donorCount,
    donations: donationCount,
    claims: claimCount,
    total_raised_cents: totalRaised._sum.amount_cents ?? 0,
  });
});

// Donations
router.get('/donations', async (req, res) => {
  const donations = await prisma.donation.findMany({
    include: { donor: true },
    orderBy: { created_at: 'desc' },
  });
  res.json(donations);
});

// Claims
router.get('/claims', async (req, res) => {
  const claims = await prisma.rewardClaim.findMany({
    include: { reward: true, donor: true },
    orderBy: { created_at: 'desc' },
  });
  res.json(claims.map(c => ({ ...c, claim_data: c.claim_data ? JSON.parse(c.claim_data) : null })));
});

router.patch('/claims/:id', async (req, res) => {
  const { status } = req.body;
  if (!['PENDING', 'FULFILLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const claim = await prisma.rewardClaim.update({
    where: { id: req.params.id },
    data: { status },
    include: { reward: true, donor: true },
  });
  res.json(claim);
});

// Rewards CRUD
router.get('/rewards', async (req, res) => {
  res.json(await prisma.reward.findMany({ orderBy: { created_at: 'desc' } }));
});

router.post('/rewards', async (req, res) => {
  const { title, description, type, cost_cents, quantity_total, is_active, custom_type_label } = req.body;
  const reward = await prisma.reward.create({
    data: { title, description, type, cost_cents, quantity_total: quantity_total ?? null, is_active: is_active ?? true, custom_type_label },
  });
  res.json(reward);
});

router.put('/rewards/:id', async (req, res) => {
  const { title, description, type, cost_cents, quantity_total, is_active, custom_type_label } = req.body;
  const reward = await prisma.reward.update({
    where: { id: req.params.id },
    data: { title, description, type, cost_cents, quantity_total: quantity_total ?? null, is_active, custom_type_label },
  });
  res.json(reward);
});

router.delete('/rewards/:id', async (req, res) => {
  await prisma.reward.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Simulate donation
router.post('/simulate-donation', async (req, res) => {
  try {
    const { email, donor_name, amount_cents, comment } = req.body;
    if (!email || !amount_cents || amount_cents < 100) {
      return res.status(400).json({ error: 'email and amount_cents (min 100) required' });
    }
    const tiltifyId = `sim-${crypto.randomUUID()}`;
    const result = await processDonation({
      tiltifyId,
      email,
      donorName: donor_name || 'Anonymous',
      amountCents: amount_cents,
      comment: comment || null,
    });
    res.json({
      success: true,
      token: result.token,
      donor: { id: result.donor.id, email: result.donor.email, balance_remaining: result.donor.balance_remaining },
    });
  } catch (err) {
    console.error('Simulate donation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Polls CRUD
router.get('/polls', async (req, res) => {
  res.json(await prisma.poll.findMany({
    include: { options: true },
    orderBy: { created_at: 'desc' },
  }));
});

router.post('/polls', async (req, res) => {
  const { title, description, is_active, ends_at, options, allow_custom_entries, max_entry_chars } = req.body;
  const poll = await prisma.poll.create({
    data: {
      title,
      description,
      is_active: is_active ?? true,
      ends_at: ends_at ? new Date(ends_at) : null,
      allow_custom_entries: allow_custom_entries ?? false,
      max_entry_chars: max_entry_chars ?? null,
      options: options?.length ? { create: options.map(o => ({ label: o.label })) } : undefined,
    },
    include: { options: true },
  });
  res.json(poll);
});

router.put('/polls/:id', async (req, res) => {
  const { title, description, is_active, ends_at, allow_custom_entries, max_entry_chars } = req.body;
  const poll = await prisma.poll.update({
    where: { id: req.params.id },
    data: {
      title, description, is_active,
      ends_at: ends_at ? new Date(ends_at) : null,
      allow_custom_entries: allow_custom_entries ?? false,
      max_entry_chars: max_entry_chars ?? null,
    },
    include: { options: true },
  });
  res.json(poll);
});

router.delete('/polls/:id', async (req, res) => {
  await prisma.poll.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post('/polls/:id/options', async (req, res) => {
  const option = await prisma.pollOption.create({
    data: { poll_id: req.params.id, label: req.body.label },
  });
  res.json(option);
});

router.delete('/polls/options/:id', async (req, res) => {
  await prisma.pollOption.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Blocked Words
router.get('/blocked-words', async (req, res) => {
  const words = await prisma.blockedWord.findMany({ orderBy: { word: 'asc' } });
  res.json(words);
});

router.post('/blocked-words', async (req, res) => {
  const { word } = req.body;
  if (!word || !word.trim()) return res.status(400).json({ error: 'word required' });
  try {
    const blocked = await prisma.blockedWord.create({ data: { word: word.trim().toLowerCase() } });
    res.json(blocked);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Word already exists' });
    throw e;
  }
});

router.delete('/blocked-words/:id', async (req, res) => {
  await prisma.blockedWord.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// Goals CRUD
router.get('/goals', async (req, res) => {
  res.json(await prisma.fundGoal.findMany({ orderBy: { created_at: 'desc' } }));
});

router.post('/goals', async (req, res) => {
  const { title, description, target_cents, is_active } = req.body;
  const goal = await prisma.fundGoal.create({
    data: { title, description, target_cents, is_active: is_active ?? true },
  });
  res.json(goal);
});

router.put('/goals/:id', async (req, res) => {
  const { title, description, target_cents, is_active, is_complete } = req.body;
  const goal = await prisma.fundGoal.update({
    where: { id: req.params.id },
    data: { title, description, target_cents, is_active, is_complete },
  });
  res.json(goal);
});

router.delete('/goals/:id', async (req, res) => {
  await prisma.fundGoal.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
