# 🔑 Vercel Environment Variables Setup

## Required Environment Variable for Google Maps

**Variable Name:** `VITE_GOOGLE_MAPS_API_KEY`  
**Variable Value:** `AIzaSyBrI5pScBDtI1v-Mgl1RjUQx7Juj5pBFgs`

## How to Add/Verify in Vercel:

1. Go to https://vercel.com
2. Select your **Logiketo** project
3. Go to **Settings** → **Environment Variables**
4. Verify or add:
   - **Key:** `VITE_GOOGLE_MAPS_API_KEY`
   - **Value:** `AIzaSyBrI5pScBDtI1v-Mgl1RjUQx7Juj5pBFgs`
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
5. **Save** the variable
6. **Redeploy** your frontend (or push a commit to trigger auto-deploy)

## Verification:

After adding, check:
- Vercel dashboard shows the variable under Environment Variables
- The variable is available in Production, Preview, and Development
- After redeploy, Google Maps should load without the "API key not found" error

## Notes:

- The key starts with `AIzaSy...`
- For Vite, all environment variables must start with `VITE_` to be exposed to the client
- The variable is read via: `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
- Local development uses `frontend/.env` file
- Production uses Vercel Environment Variables

