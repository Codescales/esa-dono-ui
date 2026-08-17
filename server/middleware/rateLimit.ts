import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

const keyGenerator = (req: Request): string =>
  (typeof req.query.token === 'string' ? req.query.token : undefined) ??
  ipKeyGenerator(req.ip ?? '');

const spendLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_SPEND) || 20,
  keyGenerator,
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests, please slow down.' }),
});

// Auth endpoints (magic-link requests, SSO initiation) are keyed purely by IP
// to throttle email/upstream abuse regardless of any token on the request.
const authLimit = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_AUTH) || 5,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  handler: (_req, res) => res.status(429).json({ error: 'Too many requests, please slow down.' }),
});

export { spendLimit, authLimit };
