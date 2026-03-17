import prisma from '../lib/prisma.js';

export async function donorAuth(req, res, next) {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required' });
  const donor = await prisma.donor.findUnique({
    where: { magic_token: token },
  });
  if (!donor) return res.status(401).json({ error: 'Invalid token' });
  if (donor.token_expires_at && new Date() > donor.token_expires_at) {
    return res.status(401).json({ error: 'Token expired' });
  }
  req.donor = donor;
  next();
}
