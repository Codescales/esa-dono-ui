/**
 * Prisma seed script for development.
 *
 * Creates persistent moderator and admin accounts that survive restarts,
 * along with a banner displaying the moderator key for easy access.
 *
 * Run via: `npx prisma db seed` (from server/ directory)
 */

// Load environment variables from the root directory
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../../.env');

loadEnv({ path: envPath });

import prisma from '../lib/prisma.js';

const DEV_MODERATOR_EMAIL = 'moderator@localhost';
const DEV_ADMIN_EMAIL = 'admin@localhost';

// Read MODERATOR_API_KEY and ADMIN_API_KEY from env, or use defaults
const MODERATOR_API_KEY = process.env.MODERATOR_API_KEY || 'dev-moderator-key';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key';

async function main() {
  console.log('🌱 Starting seed...');

  // Create or update moderator account
  const moderator = await prisma.donor.upsert({
    where: { email: DEV_MODERATOR_EMAIL },
    update: {
      role: 'MODERATOR',
      email_verified: true,
    },
    create: {
      email: DEV_MODERATOR_EMAIL,
      role: 'MODERATOR',
      email_verified: true,
      total_donated: 0,
      balance_remaining: 0,
    },
  });
  console.log(`✓ Moderator account: ${moderator.email} (ID: ${moderator.id})`);

  // Create or update admin account
  const admin = await prisma.donor.upsert({
    where: { email: DEV_ADMIN_EMAIL },
    update: {
      role: 'ADMIN',
      email_verified: true,
    },
    create: {
      email: DEV_ADMIN_EMAIL,
      role: 'ADMIN',
      email_verified: true,
      total_donated: 0,
      balance_remaining: 0,
    },
  });
  console.log(`✓ Admin account: ${admin.email} (ID: ${admin.id})`);

  // Create or update banner showing moderator and admin keys.
  // We check for an active banner first; if none exists, create one.
  // This approach allows the seed to be idempotent without hardcoding an ID.
  const existingBanner = await prisma.broadcast.findFirst();
  const bannerMessage = `🔑 Moderator Key: key_mod_${MODERATOR_API_KEY} | Admin Key: key_admin_${ADMIN_API_KEY}`;

  let banner;
  if (existingBanner) {
    banner = await prisma.broadcast.update({
      where: { id: existingBanner.id },
      data: {
        message: bannerMessage,
        level: 'INFO',
        is_active: true,
      },
    });
  } else {
    banner = await prisma.broadcast.create({
      data: {
        message: bannerMessage,
        level: 'INFO',
        is_active: true,
      },
    });
  }
  console.log(`✓ Banner created/updated with moderator and admin keys`);

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📝 Dev accounts:');
  console.log(`   Moderator: ${DEV_MODERATOR_EMAIL} (role: MODERATOR)`);
  console.log(`   Admin:     ${DEV_ADMIN_EMAIL} (role: ADMIN)`);
  console.log('');
  console.log('🔑 API Keys:');
  console.log(`   Moderator: key_mod_${MODERATOR_API_KEY}`);
  console.log(`   Admin:     key_admin_${ADMIN_API_KEY}`);
  console.log('');
  console.log('✨ Banner displayed at the top of the app showing these keys.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
