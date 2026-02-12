-- Add createdById to vehicles (nullable for existing rows)
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Add createdById to employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Backfill: set createdById for existing employees and vehicles to first admin user
DO $$
DECLARE
  first_user_id TEXT;
BEGIN
  SELECT id INTO first_user_id FROM users LIMIT 1;
  IF first_user_id IS NOT NULL THEN
    UPDATE employees SET "createdById" = first_user_id WHERE "createdById" IS NULL;
    UPDATE vehicles SET "createdById" = first_user_id WHERE "createdById" IS NULL;
  END IF;
END $$;

-- Make createdById required for employees
ALTER TABLE "employees" ALTER COLUMN "createdById" SET NOT NULL;

-- Drop old unique constraints on employees (PostgreSQL UNIQUE creates constraint, not standalone index)
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_employeeId_key";
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_email_key";

-- Add compound unique constraints for employees
CREATE UNIQUE INDEX "employees_employeeId_createdById_key" ON "employees"("employeeId", "createdById");
CREATE UNIQUE INDEX "employees_email_createdById_key" ON "employees"("email", "createdById");

-- Add foreign key for employees (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_createdById_fkey'
  ) THEN
    ALTER TABLE "employees" ADD CONSTRAINT "employees_createdById_fkey" 
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
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
