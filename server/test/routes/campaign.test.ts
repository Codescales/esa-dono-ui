import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../lib/prisma.js', () => ({
  default: {
    donation: {
      aggregate: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma.js';
import campaignRouter from '../../routes/campaign.js';

function createApp() {
  const app = express();
  app.use('/api/campaign', campaignRouter);
  return app;
}

describe('GET /api/campaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CAMPAIGN_GOAL_CENTS;
  });

  it('returns stub campaign with zero raised when no donations', async () => {
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({
      _sum: { amount_cents: null },
    } as any);

    const res = await request(createApp()).get('/api/campaign');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('ESA Charity Marathon');
    expect(res.body.description).toBeDefined();
    expect(res.body.amount_raised.value).toBe('0.00');
    expect(res.body.goal.value).toBe('5000.00');
  });

  it('computes amount raised from donation sum and uses env goal', async () => {
    process.env.CAMPAIGN_GOAL_CENTS = '100000';
    vi.mocked(prisma.donation.aggregate).mockResolvedValue({
      _sum: { amount_cents: 250000 },
    } as any);

    const res = await request(createApp()).get('/api/campaign');

    expect(res.status).toBe(200);
    expect(res.body.amount_raised.value).toBe('2500.00');
    expect(res.body.goal.value).toBe('1000.00');
  });

  it('returns 500 when the aggregate fails', async () => {
    vi.mocked(prisma.donation.aggregate).mockRejectedValue(new Error('DB error'));

    const res = await request(createApp()).get('/api/campaign');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch campaign');
  });
});
