-- Add createdById to vehicles (nullable for existing rows)
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Backfill: set createdById for existing vehicles to first user (so they're assigned to an account)
DO $$
DECLARE
  first_user_id TEXT;
BEGIN
  SELECT id INTO first_user_id FROM users LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    UPDATE vehicles SET "createdById" = first_user_id WHERE "createdById" IS NULL;
  END IF;
END $$;

-- Add foreign key for vehicles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_createdById_fkey'
  ) THEN
    ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
