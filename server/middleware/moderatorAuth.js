import { donorAuth } from './donorAuth.js';

export async function moderatorAuth(req, res, next) {
  await donorAuth(req, res, () => {
    if (!req.donor?.is_moderator) {
      return res.status(403).json({ error: 'Moderator access required' });
    }
    next();
  });
}
