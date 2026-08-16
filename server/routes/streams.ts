import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/streams
 * Public list of active streams, for the /donate stream picker.
 */
router.get('/', async (_req: Request, res: Response) => {
  const streams = await prisma.stream.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'asc' },
  });
  res.json(streams);
});

export default router;
