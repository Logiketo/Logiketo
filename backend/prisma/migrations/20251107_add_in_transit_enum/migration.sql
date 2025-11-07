-- Add IN_TRANSIT to OrderStatus enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
    AND enumlabel = 'IN_TRANSIT'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
  END IF;
END $$;

