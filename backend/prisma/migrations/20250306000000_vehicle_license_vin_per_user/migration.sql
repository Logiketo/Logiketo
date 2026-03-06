-- Drop global unique constraints on licensePlate and vin
DROP INDEX IF EXISTS "vehicles_licensePlate_key";
DROP INDEX IF EXISTS "vehicles_vin_key";

-- Normalize empty VIN to NULL (avoid unique violation when multiple vehicles have empty VIN per user)
UPDATE vehicles SET "vin" = NULL WHERE "vin" = '' OR TRIM("vin") = '';

-- Backfill any remaining NULL createdById (safety)
DO $$
DECLARE
  first_user_id TEXT;
BEGIN
  SELECT id INTO first_user_id FROM users LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    UPDATE vehicles SET "createdById" = first_user_id WHERE "createdById" IS NULL;
  END IF;
END $$;

-- Create compound unique indexes: license plate and VIN unique per user (per account)
CREATE UNIQUE INDEX "vehicles_licensePlate_createdById_key" ON "vehicles"("licensePlate", "createdById");
CREATE UNIQUE INDEX "vehicles_vin_createdById_key" ON "vehicles"("vin", "createdById");
