# 🚀 Easiest Way: Run the Fix Script

Since Railway doesn't show a Query button, I've created a script you can run directly!

## Method 1: Run on Railway (Recommended)

### Using Railway CLI:

1. **Install Railway CLI** (if not installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Navigate to your backend folder**:
   ```bash
   cd backend
   ```

4. **Link to your Railway project**:
   ```bash
   railway link
   ```
   (Select your project when prompted)

5. **Run the fix script**:
   ```bash
   railway run npm run fix:railway
   ```

That's it! The script will:
- ✅ Create the OrderStatus enum type
- ✅ Fix the orders.status column
- ✅ Fix the tracking_events.status column

## Method 2: Run Locally (If you have DATABASE_URL set)

If you have the DATABASE_URL environment variable set locally:

1. **Navigate to backend folder**:
   ```bash
   cd backend
   ```

2. **Set your Railway DATABASE_URL** (if not already set):
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql://postgres:RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC@centerbeam.proxy.rlwy.net:47845/railway"
   
   # Or Windows CMD
   set DATABASE_URL=postgresql://postgres:RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC@centerbeam.proxy.rlwy.net:47845/railway
   
   # Or Linux/Mac
   export DATABASE_URL="postgresql://postgres:RCXLrPMIfTGTCQJLQFHVnIOWTRTPZCBC@centerbeam.proxy.rlwy.net:47845/railway"
   ```

3. **Run the script**:
   ```bash
   npm run fix:railway
   ```

## What the Script Does

The script (`backend/fix-railway-database.js`) will:
1. Create the `OrderStatus` enum type if it doesn't exist
2. Convert `orders.status` from TEXT to OrderStatus enum
3. Convert `tracking_events.status` from TEXT to OrderStatus enum

It's **safe to run multiple times** - it checks if changes are needed first.

## After Running the Script

1. ✅ Database is fixed
2. ✅ Commit and push your code changes:
   ```bash
   git add backend/src/routes/orders.ts backend/src/routes/dispatch.ts backend/src/routes/reports.ts
   git commit -m "Fix: Convert all Prisma order queries to raw SQL"
   git push origin master
   ```
3. ✅ Railway will auto-redeploy (2-5 minutes)
4. ✅ Visit `https://logiketo.com/orders-active` - should work! 🎉

---

## Need the Public Connection String?

If you need the public connection string (to use with an external client), check Railway:

1. Railway → **Postgres** service → **Data** tab → **"Connect"** button
2. Look for the **public proxy URL** (not the internal one)
3. It might look like: `centerbeam.proxy.rlwy.net:47845` (check your Railway dashboard)

Or you can use the internal one from your DATABASE_URL and connect via Railway CLI.

