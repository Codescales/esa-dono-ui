import { Router, type Request, type Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

/**
 * GET /api/events
 * Public list of active events, for the /donate event picker.
 */
router.get('/', async (_req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    where: { is_active: true },
    orderBy: { created_at: 'asc' },
  });
  res.json(events);
});

export default router;
