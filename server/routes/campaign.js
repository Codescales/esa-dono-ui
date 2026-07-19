import { Router } from 'express';
import { getCampaign } from '../services/tiltify.js';

const router = Router();

const STUB_CAMPAIGN = {
  name: 'ESA Charity Marathon',
  description:
    'A charity speedrunning event raising money for a great cause. Watch runners tackle games at incredible speeds while supporting charity!',
  amount_raised: { value: '480.00' },
  goal: { value: '5000.00' },
};

router.get('/', async (req, res) => {
  if (!process.env.TILTIFY_CLIENT_ID) {
    return res.json(STUB_CAMPAIGN);
  }
  try {
    const campaign = await getCampaign();
    res.json(campaign);
  } catch (err) {
    console.error('Campaign error:', err);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

export default router;
