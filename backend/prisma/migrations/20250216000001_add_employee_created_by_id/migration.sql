-- Add createdById to employees (nullable for existing rows)
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Backfill: set createdById for existing employees to first user
DO $$
DECLARE
  first_user_id TEXT;
BEGIN
  SELECT id INTO first_user_id FROM users LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    UPDATE employees SET "createdById" = first_user_id WHERE "createdById" IS NULL;
  END IF;
END $$;

-- Make createdById required
ALTER TABLE "employees" ALTER COLUMN "createdById" SET NOT NULL;

-- Drop old unique constraints (if they exist)
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_employeeId_key";
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_email_key";

-- Add compound unique constraints for multi-tenant
CREATE UNIQUE INDEX IF NOT EXISTS "employees_employeeId_createdById_key" ON "employees"("employeeId", "createdById");
CREATE UNIQUE INDEX IF NOT EXISTS "employees_email_createdById_key" ON "employees"("email", "createdById");

-- Add foreign key (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_createdById_fkey'
  ) THEN
    ALTER TABLE "employees" ADD CONSTRAINT "employees_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
