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

-- Resolve duplicate (licensePlate, createdById) before creating unique index
-- Append suffix to duplicates: "ABC123" -> "ABC123 (2)", "ABC123 (3)", etc.
DO $$
DECLARE
  r RECORD;
  suffix INT;
  new_plate TEXT;
BEGIN
  FOR r IN (
    SELECT "licensePlate", "createdById", id, 
           ROW_NUMBER() OVER (PARTITION BY "licensePlate", "createdById" ORDER BY "createdAt", id) as rn
    FROM vehicles
    WHERE "createdById" IS NOT NULL
  ) LOOP
    IF r.rn > 1 THEN
      suffix := r.rn;
      new_plate := r."licensePlate" || ' (' || suffix || ')';
      UPDATE vehicles SET "licensePlate" = new_plate WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Resolve duplicate (vin, createdById) before creating unique index (only for non-null vin)
DO $$
DECLARE
  r RECORD;
  suffix INT;
  new_vin TEXT;
BEGIN
  FOR r IN (
    SELECT "vin", "createdById", id,
           ROW_NUMBER() OVER (PARTITION BY "vin", "createdById" ORDER BY "createdAt", id) as rn
    FROM vehicles
    WHERE "vin" IS NOT NULL AND "createdById" IS NOT NULL
  ) LOOP
    IF r.rn > 1 THEN
      suffix := r.rn;
      new_vin := r."vin" || ' (' || suffix || ')';
      UPDATE vehicles SET "vin" = new_vin WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- Create compound unique indexes: license plate and VIN unique per user (per account)
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_licensePlate_createdById_key" ON "vehicles"("licensePlate", "createdById");
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_vin_createdById_key" ON "vehicles"("vin", "createdById");
