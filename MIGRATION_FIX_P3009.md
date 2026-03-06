# Fix P3009: Failed Migration Resolution

The migration `20250306000000_vehicle_license_vin_per_user` failed. Follow these steps to fix it.

## Step 1: Mark the failed migration as rolled back

Run this against your **production database** (Railway). You need `DATABASE_URL` set.

### Option A: Railway CLI (recommended)

```bash
cd Coding
railway link   # if not already linked to your project
railway run npx prisma migrate resolve --rolled-back "20250306000000_vehicle_license_vin_per_user"
```

### Option B: Local with production DATABASE_URL

```bash
cd Coding
# Set DATABASE_URL to your Railway Postgres connection string
$env:DATABASE_URL = "postgresql://..."   # Windows PowerShell
# or
export DATABASE_URL="postgresql://..."  # Mac/Linux

npx prisma migrate resolve --rolled-back "20250306000000_vehicle_license_vin_per_user"
```

### Option C: Direct SQL (if CLI doesn't work)

Connect to your Postgres database and run:

```sql
-- Mark the migration as rolled back so Prisma will retry it
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW(), finished_at = NULL, applied_steps_count = 0
WHERE migration_name = '20250306000000_vehicle_license_vin_per_user'
  AND finished_at IS NULL;
```

## Step 2: Deploy again

The migration has been **updated** to handle duplicate license plates/VINs before creating indexes. Push and deploy:

```bash
git add .
git commit -m "fix: migration P3009 - handle duplicates before creating indexes"
git push origin master
```

Railway will auto-deploy. The `prisma migrate deploy` in your start command will re-run the migration successfully.

---

**What was fixed:** The migration now resolves duplicate `(licensePlate, createdById)` and `(vin, createdById)` pairs by appending suffixes (e.g. "ABC123 (2)") before creating the unique indexes, so the migration won't fail on existing duplicates.
