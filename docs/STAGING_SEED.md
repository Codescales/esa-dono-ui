# Running the Dev Seed on Staging (oci-public)

This guide explains how to run the Prisma seed script on the staging server to create persistent dev accounts and the banner with API keys.

## Overview

The seed script (`server/prisma/seed.ts`) creates:
- ✅ Moderator account at `moderator@localhost` 
- ✅ Admin account at `admin@localhost`
- ✅ Broadcast banner displaying current API keys from env vars

These accounts and the banner persist across database restarts, including staging's daily resets.

## Prerequisites

- SSH access to the oci-public staging server
- Docker running on the staging server
- The staging container must be running (from the latest `dev` branch images)

## Option 1: Remote SSH + Docker Exec (Recommended)

This is the safest approach - run the seed without needing to modify deployment configs.

### Steps:

1. SSH into the staging server:
```bash
ssh user@oci-public-ip
```

2. Navigate to the deployment directory (adjust path as needed):
```bash
cd /opt/esa-dono-ui  # or wherever it's deployed
```

3. Run the seed in the running backend container:
```bash
docker exec dono-backend npx prisma db seed --schema ./server/prisma/schema.prisma
```

Or if using docker-compose:
```bash
docker compose exec dono-backend npx prisma db seed --schema ./server/prisma/schema.prisma
```

4. Verify the seed completed successfully - you should see:
```
🌱 Starting seed...
✓ Moderator account: moderator@localhost (ID: ...)
✓ Admin account: admin@localhost (ID: ...)
✓ Banner created/updated with moderator and admin keys
✅ Seed completed successfully!
```

## Option 2: Using the Helper Script

If you've pulled the latest code to staging:

```bash
cd /opt/esa-dono-ui
./scripts/run-seed-staging.sh dono-backend
```

## Option 3: Manual Container Access

1. SSH into staging
2. Get a shell in the running container:
```bash
docker exec -it dono-backend sh
```

3. Inside the container, run:
```bash
cd /app
npx prisma db seed --schema ./server/prisma/schema.prisma
```

4. Exit the container:
```bash
exit
```

## Verification

After running the seed, verify the accounts were created by:

1. Visiting the staging app at `https://staging.example.com`
2. Looking for the banner at the top showing:
   ```
   🔑 Moderator Key: key_mod_dev-moderator-key | Admin Key: key_admin_change-me
   ```
   (or the values from your staging .env file)

3. Optionally, test login via moderator key in `/moderate` page

## If the Seed Fails

### Error: "Environment variable not found: DATABASE_URL"
The DATABASE_URL is set in the Docker environment, but you might need to run with the full path:
```bash
docker exec dono-backend sh -c "cd /app && npx prisma db seed --schema ./server/prisma/schema.prisma"
```

### Error: "No such file or directory: prisma/seed.ts"
Make sure the backend image was built from the latest commit (4d54458 or later with the seed feature). Pull the latest dev image:
```bash
docker pull ghcr.io/esamarathon/esa-dono-ui/backend:dev
docker compose up -d
```

Then run the seed again.

### Error: Database locked
Wait a moment and retry - the database might be in use by background tasks.

## Seed Details

**Accounts created:**
- Email: `moderator@localhost` | Role: MODERATOR | email_verified: true
- Email: `admin@localhost` | Role: ADMIN | email_verified: true

**Environment variables read:**
- `MODERATOR_API_KEY` from docker-compose/.env (default: `dev-moderator-key`)
- `ADMIN_API_KEY` from docker-compose/.env (default: `change-me`)

**API Keys shown in banner:**
- Moderator: `key_mod_{MODERATOR_API_KEY}`
- Admin: `key_admin_{ADMIN_API_KEY}`

## Daily Staging Resets

Since the seed uses database operations (not filesystem), the accounts and banner automatically survive the daily staging reset cycle:
1. Database is reset/cleared
2. Migrations run (via docker-entrypoint)
3. Simply re-run the seed script after reset to recreate the dev accounts and banner

## Integration into Staging Deployment

If you want to make the seed run automatically on staging startup:

1. Modify `docker-entrypoint.backend.sh` to include:
```bash
# After migrations
npx prisma db seed --schema ./server/prisma/schema.prisma || true
```

2. Rebuild the backend image

This way the seed runs every time the container starts.

---

**Last updated:** 2026-09-10  
**Feature commit:** 4d54458 (dev seed implementation)
