import type { Request, Response, NextFunction } from 'express';
import { parseCredential } from '../lib/authHeader.js';

/**
 * Gates `/api/admin/*` on the operational admin key, carried as
 * `Authorization: Bearer key_admin_<key>` (ADR 0004). This is an operator
 * secret for scripting/bootstrapping, not a browser credential.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_API_KEY;
  const cred = parseCredential(req);
  const provided = cred?.kind === 'admin-key' ? cred.key : undefined;

  if (!expected || !provided || provided !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
