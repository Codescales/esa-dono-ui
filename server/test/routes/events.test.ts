import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import eventsRouter from '../../routes/events.js';
import adminRouter from '../../routes/admin.js';
import moderatorRouter from '../../routes/moderator.js';

const prisma = new PrismaClient();

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/events', eventsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/moderator', moderatorRouter);
  return app;
}

async function makeModerator() {
  const token = crypto.randomBytes(16).toString('hex');
  const donor = await prisma.donor.create({
    data: {
      email: `mod-events-${Date.now()}-${Math.random()}@example.com`,
      role: 'MODERATOR',
      magic_token: token,
      token_expires_at: new Date(Date.now() + 60_000),
    },
  });
  return { donor, token };
}

describe('Events', () => {
  const createdEventIds: string[] = [];
  const createdDonorIds: string[] = [];

  beforeAll(() => {
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  afterAll(async () => {
    await prisma.donation.deleteMany({ where: { donor_id: { in: createdDonorIds } } });
    await prisma.donor.deleteMany({ where: { id: { in: createdDonorIds } } });
    await prisma.event.deleteMany({ where: { id: { in: createdEventIds } } });
    await prisma.$disconnect();
  });

  describe('GET /api/events (public)', () => {
    it('returns only active events', async () => {
      const active = await prisma.event.create({
        data: { name: `Public Active ${crypto.randomUUID()}` },
      });
      const inactive = await prisma.event.create({
        data: { name: `Public Inactive ${crypto.randomUUID()}`, is_active: false },
      });
      createdEventIds.push(active.id, inactive.id);

      const res = await request(createApp()).get('/api/events');

      expect(res.status).toBe(200);
      const ids = res.body.map((s: any) => s.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(inactive.id);
    });
  });

  describe('Admin events CRUD', () => {
    const auth = { Authorization: 'Bearer key_admin_test-admin-key' };

    it('rejects non-admin requests', async () => {
      const res = await request(createApp()).get('/api/admin/events');
      expect(res.status).toBe(401);
    });

    it('creates, updates, and deactivates an event', async () => {
      const createRes = await request(createApp())
        .post('/api/admin/events')
        .send({ name: `Admin Event ${crypto.randomUUID()}` })
        .set(auth);
      expect(createRes.status).toBe(200);
      expect(createRes.body.is_active).toBe(true);
      createdEventIds.push(createRes.body.id);

      const updateRes = await request(createApp())
        .put(`/api/admin/events/${createRes.body.id}`)
        .send({ name: 'Renamed Event' })
        .set(auth);
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Renamed Event');

      const deleteRes = await request(createApp())
        .delete(`/api/admin/events/${createRes.body.id}`)
        .set(auth);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.event.is_active).toBe(false);

      // Soft-deleted, not removed — still fetchable via admin list.
      const listRes = await request(createApp()).get('/api/admin/events').set(auth);
      expect(listRes.body.some((s: any) => s.id === createRes.body.id)).toBe(true);
    });

    it('rejects duplicate event names', async () => {
      const name = `Dup Event ${crypto.randomUUID()}`;
      const first = await request(createApp()).post('/api/admin/events').send({ name }).set(auth);
      createdEventIds.push(first.body.id);

      const second = await request(createApp()).post('/api/admin/events').send({ name }).set(auth);
      expect(second.status).toBe(409);
    });

    it('includes per-event raised totals in /admin/stats', async () => {
      const event = await prisma.event.create({
        data: { name: `Stats Event ${crypto.randomUUID()}` },
      });
      createdEventIds.push(event.id);

      const donor = await prisma.donor.create({
        data: {
          email: `stats-${crypto.randomUUID()}@example.com`,
          total_donated: 1000,
          balance_remaining: 1000,
        },
      });
      createdDonorIds.push(donor.id);

      await prisma.donation.create({
        data: {
          external_id: `stats-${crypto.randomUUID()}`,
          donor_id: donor.id,
          amount_cents: 1000,
          event_id: event.id,
        },
      });

      const res = await request(createApp()).get('/api/admin/stats').set(auth);
      expect(res.status).toBe(200);
      const entry = res.body.events.find((s: any) => s.id === event.id);
      expect(entry).toBeTruthy();
      expect(entry.raised_cents).toBe(1000);
      expect(entry.donations).toBe(1);
    });
  });

  describe('Moderator events CRUD', () => {
    it('rejects non-moderator requests', async () => {
      const res = await request(createApp()).get('/api/moderator/events');
      expect(res.status).toBe(401);
    });

    it('creates and updates an event', async () => {
      const { token } = await makeModerator();

      const createRes = await request(createApp())
        .post('/api/moderator/events')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: `Moderator Event ${crypto.randomUUID()}` });
      expect(createRes.status).toBe(200);
      createdEventIds.push(createRes.body.id);

      const updateRes = await request(createApp())
        .put(`/api/moderator/events/${createRes.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ is_active: false });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.is_active).toBe(false);
    });
  });
});
