-- Fix OrderStatus enum type in database
-- This migration ensures the columns are properly typed as enum instead of TEXT

-- Create OrderStatus enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Convert orders.status from TEXT to OrderStatus enum
-- This handles the case where the column might be TEXT or already enum
DO $$ 
BEGIN
  -- Check if column is already the right type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'status' 
    AND udt_name = 'OrderStatus'
  ) THEN
    RAISE NOTICE 'orders.status is already OrderStatus enum type';
  ELSE
    -- Convert from whatever type it is to OrderStatus enum
    ALTER TABLE orders 
    ALTER COLUMN status TYPE "OrderStatus" 
    USING CASE 
      WHEN status::text = 'PENDING' THEN 'PENDING'::"OrderStatus"
      WHEN status::text = 'ASSIGNED' THEN 'ASSIGNED'::"OrderStatus"
      WHEN status::text = 'IN_TRANSIT' THEN 'IN_TRANSIT'::"OrderStatus"
      WHEN status::text = 'DELIVERED' THEN 'DELIVERED'::"OrderStatus"
      WHEN status::text = 'CANCELLED' THEN 'CANCELLED'::"OrderStatus"
      WHEN status::text = 'RETURNED' THEN 'RETURNED'::"OrderStatus"
      ELSE 'PENDING'::"OrderStatus"
    END;
    
    RAISE NOTICE 'Converted orders.status to OrderStatus enum';
  END IF;
END $$;

-- Convert tracking_events.status from TEXT to OrderStatus enum
DO $$ 
BEGIN
  -- Check if column is already the right type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_events' 
    AND column_name = 'status' 
    AND udt_name = 'OrderStatus'
  ) THEN
    RAISE NOTICE 'tracking_events.status is already OrderStatus enum type';
  ELSE
    -- Convert from whatever type it is to OrderStatus enum
    ALTER TABLE tracking_events 
    ALTER COLUMN status TYPE "OrderStatus" 
    USING CASE 
      WHEN status::text = 'PENDING' THEN 'PENDING'::"OrderStatus"
      WHEN status::text = 'ASSIGNED' THEN 'ASSIGNED'::"OrderStatus"
      WHEN status::text = 'IN_TRANSIT' THEN 'IN_TRANSIT'::"OrderStatus"
      WHEN status::text = 'DELIVERED' THEN 'DELIVERED'::"OrderStatus"
      WHEN status::text = 'CANCELLED' THEN 'CANCELLED'::"OrderStatus"
      WHEN status::text = 'RETURNED' THEN 'RETURNED'::"OrderStatus"
      ELSE 'PENDING'::"OrderStatus"
    END;
    
    RAISE NOTICE 'Converted tracking_events.status to OrderStatus enum';
  END IF;
END $$;

