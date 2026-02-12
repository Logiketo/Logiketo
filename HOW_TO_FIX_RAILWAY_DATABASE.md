# 🔧 Step-by-Step: How to Fix Railway Database

## Quick Steps (5 minutes)

### Step 1: Access Railway Dashboard
1. Go to **https://railway.app** and log in
2. You should see your project(s)

### Step 2: Find Your PostgreSQL Service
1. In your Railway project, look for the **PostgreSQL** service (it's usually a separate service from your backend)
2. It might be labeled as:
   - "PostgreSQL"
   - "Database"
   - "Postgres"
   - Or have a 🐘 elephant icon

3. **Click on the PostgreSQL service** (not the backend service)

### Step 3: Open the Query Tool
1. Once you're in the PostgreSQL service page, look for tabs at the top:
   - **Variables**
   - **Metrics**
   - **Data** ← **Click this one**
   - **Settings**
   - **Deployments**

2. Click the **"Data"** tab

3. You'll see options like:
   - **"Query"** button
   - **"Postgres"** button
   - **"Table Editor"**
   - **"Connect"** button

4. Click **"Query"** (or **"Postgres"** if that's what you see)

### Step 4: Copy and Paste the SQL
1. A query editor will open (looks like a text box)
2. **Delete any existing text** in the editor
3. **Copy the ENTIRE SQL block below** (select all and Ctrl+C)
4. **Paste it into the Railway query editor** (Ctrl+V)

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

### Step 5: Run the Query
1. Look for a **"Run"** button or **"Execute"** button (usually at the bottom right or top right)
2. Click **"Run"** (or press Ctrl+Enter if supported)
3. Wait a few seconds...

### Step 6: Check for Success
1. You should see a success message like:
   - ✅ "Query executed successfully"
   - ✅ "Success" 
   - ✅ Or a table showing results

2. If you see an error, it might say:
   - ❌ "already exists" - **This is OK!** It means the enum already exists, which is fine.
   - ❌ "syntax error" - Check that you copied the entire SQL block correctly

3. **If successful**, you're done! ✅

---

## Alternative Method: If You Don't See "Query" Button

### Option A: Use Railway CLI
If you have Railway CLI installed:

```bash
railway login
railway link  # Link to your project
railway connect postgres
```

Then paste the SQL and press Enter.

### Option B: Use External Tool
1. In Railway PostgreSQL service → **"Data"** tab → **"Connect"** button
2. Copy the connection string (looks like: `postgresql://user:pass@host:port/dbname`)
3. Use a PostgreSQL client like:
   - **pgAdmin** (free, download from pgadmin.org)
   - **DBeaver** (free, download from dbeaver.io)
   - **TablePlus** (macOS, free trial)
   - **psql** command line (if you have PostgreSQL installed)

4. Connect using that connection string
5. Run the SQL in the query editor

---

## Visual Guide (What You're Looking For)

```
Railway Dashboard
├── Your Project
    ├── PostgreSQL Service 🐘 ← Click this
    │   ├── Variables tab
    │   ├── Metrics tab
    │   ├── Data tab ← Click this
    │   │   ├── Query button ← Click this
    │   │   │   └── [Paste SQL here and click Run]
    │   ├── Settings tab
    │   └── Deployments tab
    └── Backend Service (Node.js)
```

---

## Troubleshooting

**Q: I can't find the PostgreSQL service**
- It might be in a different project
- Check if it's named differently (Database, Postgres, etc.)
- You might have multiple services - look for the one with database icon

**Q: The Query button is grayed out or missing**
- Try refreshing the page
- Check if you have the right permissions
- Try the "Connect" button instead and use an external tool

**Q: I see an error about "already exists"**
- That's fine! The enum type already exists, which is good
- The ALTER TABLE statements will still run if needed

**Q: I see "permission denied"**
- You might need admin access to the Railway project
- Contact the project owner to run the SQL

---

## After Running the SQL

1. ✅ Database is fixed
2. ✅ Next: Commit and push your code changes to GitHub
3. ✅ Railway will auto-redeploy with the fixed code
4. ✅ Your website should work! 🎉

Need help? Let me know what you see in your Railway dashboard!

