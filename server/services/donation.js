import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { sendMagicLink } from './email.js';

/**
 * Shared donation processing — used by both the Tiltify webhook
 * and the admin simulation endpoint.
 *
 * Idempotent: if tiltifyId already exists, returns { duplicate: true }
 * without crediting balance or sending email.
 *
 * Stable token: existing donors keep their magic_token (not rotated).
 * Only new donors get a fresh token. TTL is extended on repeat donations.
 *
 * @returns {{ donor, token }} | {{ duplicate: true }}
 */
export async function processDonation({ tiltifyId, email, donorName, amountCents, comment }) {
  const normalizedEmail = email.trim().toLowerCase();

  const moderatorEmails = (process.env.MODERATOR_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  const isModerator = moderatorEmails.includes(normalizedEmail);

  try {
    return await prisma.$transaction(async (tx) => {
      const token = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const donor = await tx.donor.upsert({
        where: { email: normalizedEmail },
        update: {
          total_donated: { increment: amountCents },
          balance_remaining: { increment: amountCents },
          token_expires_at: tokenExpiresAt,
          ...(isModerator ? { is_moderator: true } : {}),
        },
        create: {
          email: normalizedEmail,
          total_donated: amountCents,
          balance_remaining: amountCents,
          magic_token: token,
          token_expires_at: tokenExpiresAt,
          is_moderator: isModerator,
        },
      });

      await tx.donation.create({
        data: {
          tiltify_id: tiltifyId,
          donor_id: donor.id,
          amount_cents: amountCents,
          donor_name: donorName,
          comment,
        },
      });

      sendMagicLink(normalizedEmail, donor.magic_token).catch((err) =>
        console.error('Email error:', err),
      );

      return { donor, token: donor.magic_token };
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return { duplicate: true };
    }
    throw err;
  }
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
  const lowerBlocked = new Set(blockedWords.map((w) => w.word.toLowerCase()));

  for (const word of words) {
    if (lowerBlocked.has(word)) {
      return `Entry contains blocked word: "${word}"`;
    }
  }
  return null;
}
