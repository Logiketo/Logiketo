# Fix for Prisma Enum Type Error

## Problem
The error `operator does not exist: text = "OrderStatus"` occurs because:
1. The database column `orders.status` might be TEXT instead of the `OrderStatus` enum type
2. Prisma queries are trying to compare enum values but PostgreSQL doesn't recognize the enum type

## Solution

### Step 1: Run the Database Fix Script

Run the fix script to ensure enum types exist and columns are properly typed:

```bash
cd backend
npm run fix:enums
```

Or directly:
```bash
cd backend
node fix-enum-types.js
```

This script will:
- Create all required enum types if they don't exist
- Convert `orders.status` from TEXT to `OrderStatus` enum if needed
- Convert `tracking_events.status` from TEXT to `OrderStatus` enum if needed

### Step 2: Rebuild and Deploy

After running the fix script:

1. **Regenerate Prisma Client** (if needed):
   ```bash
   cd backend
   npx prisma generate
   ```

2. **Rebuild the backend**:
   ```bash
   npm run build
   ```

3. **Restart your Railway service**:
   - The changes should be automatically deployed via your GitHub/Vercel setup
   - Or manually restart your Railway service

### Step 3: Verify the Fix

The code changes made:
- ✅ `backend/src/routes/orders.ts` - Already using raw SQL (no changes needed)
- ✅ `backend/src/routes/dispatch.ts` - Converted to raw SQL for all enum comparisons
- ✅ `backend/src/routes/reports.ts` - Converted groupBy to raw SQL

All queries now use `CAST(status AS TEXT)` to avoid enum type mismatches.

## Alternative: Manual Database Fix

If you can't run the script, you can manually fix the database in Railway:

1. Connect to your PostgreSQL database in Railway
2. Run these SQL commands:

```sql
-- Create enum types (if they don't exist)
CREATE TYPE IF NOT EXISTS "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- Convert orders.status to enum
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

-- Convert tracking_events.status to enum
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
```

## Testing

After deployment, test:
- ✅ Orders page loads without errors
- ✅ Dashboard loads correctly
- ✅ Reports page works
- ✅ Order status updates work

## Notes

- The code now uses raw SQL for all enum comparisons to avoid Prisma enum type issues
- This is a workaround for Prisma's enum handling in PostgreSQL
- The database schema should match the Prisma schema for best results

