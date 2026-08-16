import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import streamsRouter from '../../routes/streams.js';
import adminRouter from '../../routes/admin.js';
import moderatorRouter from '../../routes/moderator.js';

const prisma = new PrismaClient();

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/streams', streamsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/moderator', moderatorRouter);
  return app;
}

async function makeModerator() {
  const token = crypto.randomBytes(16).toString('hex');
  const donor = await prisma.donor.create({
    data: {
      email: `mod-streams-${Date.now()}-${Math.random()}@example.com`,
      role: 'MODERATOR',
      magic_token: token,
      token_expires_at: new Date(Date.now() + 60_000),
    },
  });
  return { donor, token };
}

describe('Streams', () => {
  const createdStreamIds: string[] = [];
  const createdDonorIds: string[] = [];

  beforeAll(() => {
    process.env.ADMIN_API_KEY = 'test-admin-key';
  });

  afterAll(async () => {
    await prisma.donation.deleteMany({ where: { donor_id: { in: createdDonorIds } } });
    await prisma.donor.deleteMany({ where: { id: { in: createdDonorIds } } });
    await prisma.stream.deleteMany({ where: { id: { in: createdStreamIds } } });
    await prisma.$disconnect();
  });

  describe('GET /api/streams (public)', () => {
    it('returns only active streams', async () => {
      const active = await prisma.stream.create({
        data: { name: `Public Active ${crypto.randomUUID()}` },
      });
      const inactive = await prisma.stream.create({
        data: { name: `Public Inactive ${crypto.randomUUID()}`, is_active: false },
      });
      createdStreamIds.push(active.id, inactive.id);

      const res = await request(createApp()).get('/api/streams');

      expect(res.status).toBe(200);
      const ids = res.body.map((s: any) => s.id);
      expect(ids).toContain(active.id);
      expect(ids).not.toContain(inactive.id);
    });
  });

  describe('Admin streams CRUD', () => {
    const auth = { 'x-admin-key': 'test-admin-key' };

    it('rejects non-admin requests', async () => {
      const res = await request(createApp()).get('/api/admin/streams');
      expect(res.status).toBe(401);
    });

    it('creates, updates, and deactivates a stream', async () => {
      const createRes = await request(createApp())
        .post('/api/admin/streams')
        .send({ name: `Admin Stream ${crypto.randomUUID()}` })
        .set(auth);
      expect(createRes.status).toBe(200);
      expect(createRes.body.is_active).toBe(true);
      createdStreamIds.push(createRes.body.id);

      const updateRes = await request(createApp())
        .put(`/api/admin/streams/${createRes.body.id}`)
        .send({ name: 'Renamed Stream' })
        .set(auth);
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.name).toBe('Renamed Stream');

      const deleteRes = await request(createApp())
        .delete(`/api/admin/streams/${createRes.body.id}`)
        .set(auth);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.stream.is_active).toBe(false);

      // Soft-deleted, not removed — still fetchable via admin list.
      const listRes = await request(createApp()).get('/api/admin/streams').set(auth);
      expect(listRes.body.some((s: any) => s.id === createRes.body.id)).toBe(true);
    });

    it('rejects duplicate stream names', async () => {
      const name = `Dup Stream ${crypto.randomUUID()}`;
      const first = await request(createApp()).post('/api/admin/streams').send({ name }).set(auth);
      createdStreamIds.push(first.body.id);

      const second = await request(createApp()).post('/api/admin/streams').send({ name }).set(auth);
      expect(second.status).toBe(409);
    });

    it('includes per-stream raised totals in /admin/stats', async () => {
      const stream = await prisma.stream.create({
        data: { name: `Stats Stream ${crypto.randomUUID()}` },
      });
      createdStreamIds.push(stream.id);

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
          stream_id: stream.id,
        },
      });

      const res = await request(createApp()).get('/api/admin/stats').set(auth);
      expect(res.status).toBe(200);
      const entry = res.body.streams.find((s: any) => s.id === stream.id);
      expect(entry).toBeTruthy();
      expect(entry.raised_cents).toBe(1000);
      expect(entry.donations).toBe(1);
    });
  });

  describe('Moderator streams CRUD', () => {
    it('rejects non-moderator requests', async () => {
      const res = await request(createApp()).get('/api/moderator/streams');
      expect(res.status).toBe(401);
    });

    it('creates and updates a stream', async () => {
      const { token } = await makeModerator();

      const createRes = await request(createApp())
        .post('/api/moderator/streams')
        .query({ token })
        .send({ name: `Moderator Stream ${crypto.randomUUID()}` });
      expect(createRes.status).toBe(200);
      createdStreamIds.push(createRes.body.id);

      const updateRes = await request(createApp())
        .put(`/api/moderator/streams/${createRes.body.id}`)
        .query({ token })
        .send({ is_active: false });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.is_active).toBe(false);
    });
  });
});
