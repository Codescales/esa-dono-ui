import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../lib/prisma.js', () => ({
  default: {
    donor: { upsert: vi.fn() },
    donation: { upsert: vi.fn() },
  },
}));

vi.mock('../../services/email.js', () => ({
  sendMagicLink: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../../lib/prisma.js';
import webhookRouter from '../../routes/webhook.js';

function createApp() {
  const app = express();
  app.use(express.raw({ type: 'application/json' }));
  app.use('/api/webhooks/tiltify', webhookRouter);
  return app;
}

describe('POST /api/webhooks/tiltify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TILTIFY_WEBHOOK_SECRET = '';
  });

  it('returns 200 for non-donation events', async () => {
    const payload = {
      meta: { event_type: 'test.donation.updated' },
      data: {},
    };

    const res = await request(createApp())
      .post('/api/webhooks/tiltify')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });

  it('processes a valid donation.completed event', async () => {
    const donor = { id: 'donor-1', email: 'donor@example.com' };
    prisma.donor.upsert.mockResolvedValue(donor);
    prisma.donation.upsert.mockResolvedValue({});

    const payload = {
      meta: { event_type: 'donation.completed' },
      data: {
        id: '12345',
        donor_email: 'donor@example.com',
        donor_name: 'Test Donor',
        amount: { value: '25.00' },
        comment: 'Great cause!',
      },
    };

    const res = await request(createApp())
      .post('/api/webhooks/tiltify')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prisma.donor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'donor@example.com' },
      }),
    );
    expect(prisma.donation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tiltify_id: '12345' },
      }),
    );
  });

  it('skips when email is missing', async () => {
    const payload = {
      meta: { event_type: 'donation.completed' },
      data: {
        id: '12345',
        amount: { value: '25.00' },
      },
    };

    const res = await request(createApp())
      .post('/api/webhooks/tiltify')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(payload));

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe('missing email or id');
  });

  it('validates HMAC signature when secret is set', async () => {
    process.env.TILTIFY_WEBHOOK_SECRET = 'my-secret';
    const crypto = await import('crypto');

    const payload = JSON.stringify({
      meta: { event_type: 'donation.completed' },
      data: { id: '12345' },
    });

    const timestamp = Date.now().toString();
    const message = timestamp + '.' + payload;
    const signature = crypto.createHmac('sha256', 'my-secret').update(message).digest('hex');

    const res = await request(createApp())
      .post('/api/webhooks/tiltify')
      .set('Content-Type', 'application/json')
      .set('x-tiltify-timestamp', timestamp)
      .set('x-tiltify-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
  });

  it('rejects invalid HMAC signature', async () => {
    process.env.TILTIFY_WEBHOOK_SECRET = 'my-secret';

    const res = await request(createApp())
      .post('/api/webhooks/tiltify')
      .set('Content-Type', 'application/json')
      .set('x-tiltify-timestamp', '12345')
      .set('x-tiltify-signature', 'invalid-sig')
      .send(JSON.stringify({ meta: { event_type: 'donation.completed' }, data: {} }));

    expect(res.status).toBe(401);
  });
});
