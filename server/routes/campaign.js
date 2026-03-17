import { Router } from 'express';
import { getCampaign } from '../services/tiltify.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const campaign = await getCampaign();
    res.json(campaign);
  } catch (err) {
    console.error('Campaign error:', err);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

export default router;
