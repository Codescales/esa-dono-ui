# Running Seed on OCI-Public Staging Server

## Quick Instructions

To run the new dev seed script on the oci-public staging server and create persistent dev accounts + banner:

### Prerequisites
- SSH access to oci-public staging server
- Docker compose deployed and running on staging
- Latest images pulled (commit 4d54458 or later with seed feature)

### Execute on Staging Server

```bash
# SSH into staging
ssh user@oci-public-ip

# Navigate to deployment directory
cd /opt/esa-dono-ui  # (or wherever deployed)

# Run the seed
docker compose exec dono-backend npx prisma db seed --schema ./server/prisma/schema.prisma

# Expected output:
# 🌱 Starting seed...
# ✓ Moderator account: moderator@localhost (ID: ...)
# ✓ Admin account: admin@localhost (ID: ...)
# ✓ Banner created/updated with moderator and admin keys
# ✅ Seed completed successfully!
```

## What Gets Created

**Accounts:**
- `moderator@localhost` (role: MODERATOR, email_verified: true)
- `admin@localhost` (role: ADMIN, email_verified: true)

**Banner:**
- Displays at top of app showing moderator and admin API keys
- Message: `🔑 Moderator Key: key_mod_<KEY> | Admin Key: key_admin_<KEY>`
- Uses keys from MODERATOR_API_KEY and ADMIN_API_KEY env vars

## Persistence

✅ Accounts and banner survive:
- Database restarts
- Container restarts
- Staging daily reset cycle

Simply re-run the seed after any reset to recreate the accounts and banner.

## Verification

1. Visit the staging app at `https://staging.esa.example.com`
2. Look for the blue INFO-level banner at the top with the API keys
3. Try moderator login at `/moderate` with the displayed key
4. Try admin login at `/admin` with the displayed key

## If Running in Non-Interactive Shell

If using automation or scripts that don't have an interactive terminal:

```bash
docker compose exec -T dono-backend npx prisma db seed --schema ./server/prisma/schema.prisma
```

The `-T` flag disables pseudo-TTY allocation.

## Using the Helper Script

If code has been pulled to staging:

```bash
cd /opt/esa-dono-ui
./scripts/run-seed-staging.sh dono-backend
```

## Documentation

- **Full dev seed documentation:** `docs/deployment.md#seeding-data`
- **Detailed staging guide:** `docs/STAGING_SEED.md`
- **Implementation details:** `DEV_SEED.md`
- **CLAUDE.md reference:** See Bootstrap section for local seed usage

## Troubleshooting

### "npx: command not found"
The backend image must have Node.js installed. Verify the image was built from commit 4d54458+:
```bash
docker image inspect ghcr.io/esamarathon/esa-dono-ui/backend:dev | grep -A5 "Created"
```

Pull latest:
```bash
docker pull ghcr.io/esamarathon/esa-dono-ui/backend:dev
docker compose up -d
```

### "Environment variable not found: DATABASE_URL"
DATABASE_URL is set in docker-compose.yml. Try the full working directory:
```bash
docker compose exec dono-backend sh -c "cd /app && npx prisma db seed --schema ./server/prisma/schema.prisma"
```

### "database is locked"
Another process is accessing the database. Wait a moment and retry:
```bash
sleep 5
docker compose exec dono-backend npx prisma db seed --schema ./server/prisma/schema.prisma
```

### Seed ran but banner doesn't appear
Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete) and reload.

---

**Commit:** 4d54458 (feat: add dev seed with persistent moderator/admin accounts and banner)
**Branch:** dev
**Date:** 2026-09-10
