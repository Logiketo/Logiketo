# How to Run the Enum Fix on Railway

You have several options to run the fix script on Railway:

## Option 1: Railway CLI (Easiest)

1. **Install Railway CLI** (if not installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project** (from the backend directory):
   ```bash
   cd backend
   railway link
   ```

4. **Run the fix script**:
   ```bash
   railway run node fix-enum-types.js
   ```

This will execute the script directly on Railway with access to your database.

## Option 2: Run via Railway Web Console

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **Settings** → **Service Settings**
4. Click **Deploy Command** or use the **Railway Shell**
5. In the shell/terminal, run:
   ```bash
   cd /app  # or wherever your code is
   node fix-enum-types.js
   ```

## Option 3: Add as a One-Time Task

You can also run this as a one-time deployment task:

1. In Railway, go to your backend service
2. Click **Settings** → **Generate Domain**
3. Or use **Deploy** tab → **Deploy Command** and temporarily set:
   ```
   node fix-enum-types.js && npm start
   ```

But this will run every deployment, so revert it after the first successful run.

## Option 4: Manual SQL (Fastest)

If you have direct access to your PostgreSQL database:

1. In Railway, go to your PostgreSQL service
2. Click **Data** tab → **Connect** → Copy connection string
3. Use any PostgreSQL client (pgAdmin, DBeaver, or Railway's built-in query tool)
4. Run the SQL from `backend/FIX_ENUM_ERROR.md` section "Alternative: Manual Database Fix"

## Recommended: Option 4 (Manual SQL)

The fastest way is to just run the SQL directly in Railway's PostgreSQL console:

1. Go to Railway dashboard
2. Click on your **PostgreSQL** service (not the backend)
3. Go to **Data** tab
4. Click **Query** or use the **Postgres** tab
5. Paste and run this SQL:

```sql
-- Create enum types (if they don't exist)
DO $$ BEGIN
  CREATE TYPE IF NOT EXISTS "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

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

6. Click **Run Query**
7. Done! Your database is fixed.

## After Running the Fix

1. **Restart your backend service** on Railway (if needed)
2. **Test** your website - `logiketo.com/orders-active` should work now

The code changes are already deployed, so once the database is fixed, everything should work!

