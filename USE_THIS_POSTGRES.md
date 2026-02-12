# ✅ Use "Postgres" Service (Not Postgres-i6DB)

Based on your `DATABASE_URL`:
```
postgresql://postgres:RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC@postgres.railway.internal:5432/railway
```

The host is `postgres.railway.internal`, which means your Logiketo app connects to the **"Postgres"** service.

## Steps to Fix Database

1. **In Railway Dashboard**, click on **"Postgres"** service (the one WITHOUT "-i6DB" suffix)
   - It should have volume `postgres-volume`

2. Click the **"Data"** tab

3. Click the **"Query"** button (or "Postgres" button)

4. **Copy and paste this SQL**, then click **"Run"**:

```sql
-- Create OrderStatus enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Fix orders.status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'status' 
    AND udt_name = 'OrderStatus'
  ) THEN
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
  END IF;
END $$;

-- Fix tracking_events.status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracking_events' 
    AND column_name = 'status' 
    AND udt_name = 'OrderStatus'
  ) THEN
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
  END IF;
END $$;
```

5. You should see a success message! ✅

---

## About "Postgres-i6DB"

The **"Postgres-i6DB"** service is likely:
- Unused/old database
- Backup or test database
- Or from a different project

**You can ignore it for now** - it's not connected to your Logiketo app.

If you want to clean it up later (to save costs), you can delete it, but **ONLY AFTER** confirming it's not used by any other service.

---

## After Running the SQL

1. ✅ Database is fixed
2. ✅ Commit and push your code changes
3. ✅ Railway will auto-redeploy
4. ✅ Your website should work! 🎉

