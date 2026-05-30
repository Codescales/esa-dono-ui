import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { sendMagicLink } from './email.js';

/**
 * Shared donation processing — used by both the Tiltify webhook
 * and the admin simulation endpoint.
 *
 * @returns {{ donor, token }}
 */
export async function processDonation({ tiltifyId, email, donorName, amountCents, comment }) {
  // Generate magic token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Check moderator eligibility
  const moderatorEmails = (process.env.MODERATOR_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase());
  const isModerator = moderatorEmails.includes(email.toLowerCase());

  // Upsert donor
  const data = {
    total_donated: { increment: amountCents },
    balance_remaining: { increment: amountCents },
    magic_token: token,
    token_expires_at: tokenExpiresAt,
    is_moderator: isModerator,
  };

  const donor = await prisma.donor.upsert({
    where: { email },
    update: data,
    create: {
      email,
      total_donated: amountCents,
      balance_remaining: amountCents,
      magic_token: token,
      token_expires_at: tokenExpiresAt,
      is_moderator: isModerator,
    },
  });

  // Upsert donation (idempotency)
  await prisma.donation.upsert({
    where: { tiltify_id: tiltifyId },
    update: {},
    create: {
      tiltify_id: tiltifyId,
      donor_id: donor.id,
      amount_cents: amountCents,
      donor_name: donorName,
      comment,
    },
  });

  // Fire-and-forget email
  sendMagicLink(email, token).catch(err => console.error('Email error:', err));

  return { donor, token };
}

/**
 * Check text against the global blocked-words dictionary.
 * Returns an error message string if a blocked word is found, or null if clean.
 */
export async function checkBlockedWords(text) {
  if (!text) return null;
  const blockedWords = await prisma.blockedWord.findMany();
  if (blockedWords.length === 0) return null;

  // Split by word boundaries, extract only word char sequences
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const lowerBlocked = new Set(blockedWords.map(w => w.word.toLowerCase()));

  for (const word of words) {
    if (lowerBlocked.has(word)) {
      return `Entry contains blocked word: "${word}"`;
    }
  }
  return null;
}
