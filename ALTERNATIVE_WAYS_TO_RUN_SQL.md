# 🔧 Alternative Ways to Run SQL on Railway

If you don't see a "Query" button in the Data tab, here are other ways:

## Option 1: Use "Connect" Button (Easiest)

1. In Railway → **Postgres** service → **Data** tab
2. Look for **"Connect"** button or **"Connection"** section
3. Copy the connection string (it might show as a URL or separate fields)
4. You'll see something like:
   ```
   PGHOST=...
   PGPORT=...
   PGUSER=...
   PGPASSWORD=...
   PGDATABASE=...
   ```
5. Use one of the methods below with these credentials

## Option 2: Railway CLI (Recommended)

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project (from your project root)
railway link

# Connect to PostgreSQL
railway connect postgres
```

This will open a PostgreSQL prompt where you can paste the SQL.

**OR** run the SQL directly:

```bash
railway run psql $DATABASE_URL -c "YOUR_SQL_HERE"
```

But you'll need to format it properly. Better to use the interactive method above.

## Option 3: Use Railway's "Postgres" Tab

1. In Railway → **Postgres** service → **Data** tab
2. Look for tabs within the Data section:
   - **"Table Editor"** - for editing tables visually
   - **"Postgres"** - might open a query editor
   - **"Connect"** - shows connection info
   - **"Query"** - query editor (might be hidden)

3. Try clicking **"Postgres"** if you see it - it might open a query interface

## Option 4: Use External PostgreSQL Client

1. **Get Connection String:**
   - Railway → **Postgres** service → **Data** tab → **"Connect"** button
   - Copy the connection string or individual credentials:
     ```
     Host: postgres.railway.internal (or the public proxy URL)
     Port: 5432
     User: postgres
     Password: RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC
     Database: railway
     ```

2. **Use a PostgreSQL Client:**

   **Option A: pgAdmin (Free, GUI)**
   - Download from: https://www.pgadmin.org/download/
   - Install and open
   - Right-click "Servers" → "Create" → "Server"
   - In "Connection" tab, enter:
     - Host: `centerbeam.proxy.rlwy.net` (or check Railway for the public proxy)
     - Port: `47845` (check your Railway connection details)
     - Database: `railway`
     - Username: `postgres`
     - Password: `RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC`
   - Save and connect
   - Right-click database → "Query Tool"
   - Paste SQL and run

   **Option B: DBeaver (Free, Cross-platform)**
   - Download from: https://dbeaver.io/download/
   - Install and open
   - Click "New Database Connection"
   - Select "PostgreSQL"
   - Enter connection details (same as above)
   - Test connection → Finish
   - Right-click database → "SQL Editor" → "New SQL Script"
   - Paste SQL and run

   **Option C: TablePlus (macOS/Windows, Free Trial)**
   - Download from: https://tableplus.com/
   - Create new PostgreSQL connection
   - Enter credentials
   - Connect and run SQL

   **Option D: Command Line (psql)**
   If you have PostgreSQL installed locally:
   ```bash
   psql "postgresql://postgres:RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC@centerbeam.proxy.rlwy.net:47845/railway"
   ```
   Then paste the SQL

## Option 5: Railway One-Click Apps or Script

If Railway has a "Run Script" or "One-Click" option:
1. Check if there's a "Scripts" or "Tasks" section
2. Create a new script/task
3. Run the SQL from there

## Option 6: Check "Settings" Tab

Sometimes Railway hides the query tool:
1. Go to **Postgres** service → **Settings** tab
2. Look for "Database Tools" or "Query Interface"
3. Or look for environment variables that might give you connection details

## Option 7: Use Node.js Script (Temporary)

I can create a Node.js script that connects to your database and runs the SQL. Then you can run it locally or deploy it temporarily.

---

## Recommended: Railway CLI Method

The easiest is **Railway CLI**:

```bash
railway login
railway link
railway connect postgres
# Then paste the SQL when prompted
```

Or I can create a simple script file you can run with:
```bash
railway run node fix-database-enum.js
```

**Which option would you like to try?** Let me know what you see in the Data tab, and I'll guide you through the best method for your Railway setup.

