# Railway Persistent Storage Setup Guide

## Problem
Railway uses **ephemeral storage** by default, which means files uploaded to the filesystem are **lost when the container restarts**. This is why uploaded documents disappear.

## Solution: Railway Persistent Volumes

Railway offers persistent volumes that survive container restarts. Here's how to set it up:

### Step 1: Create a Volume in Railway

1. Go to your **Railway Dashboard**
2. Select your **Backend service**
3. Click on the **"Volumes"** tab (or go to Settings → Volumes)
4. Click **"New Volume"**
5. Name it: `uploads-storage`
6. Set the mount path: `/app/uploads` (or `/data/uploads` - choose a path)
7. Click **"Create"**

### Step 2: Update Environment Variable

1. In your Railway service, go to **"Variables"** tab
2. Add or update the `UPLOAD_PATH` environment variable:
   - **Name**: `UPLOAD_PATH`
   - **Value**: `/app/uploads` (must match the volume mount path from Step 1)
3. Save the changes

### Step 3: Redeploy

Railway will automatically redeploy when you add a volume. The files will now persist across container restarts.

## Alternative: Cloud Storage (Recommended for Production)

For production, consider using cloud storage services:

### Option A: AWS S3
- More reliable and scalable
- Files are stored in the cloud, not on the server
- Requires AWS account setup

### Option B: Cloudinary
- Easy to set up
- Free tier available
- Handles image optimization automatically

### Option C: Google Cloud Storage
- Similar to S3
- Good integration with other Google services

## Current Status

The code now includes detailed logging. Check Railway logs when:
- Uploading files (look for `[UPLOAD]` and `[ORDER UPLOAD]` messages)
- Accessing files (look for `[FILE SERVE]` messages)

This will help diagnose if files are being uploaded but lost, or if there's another issue.

## Next Steps

1. **Quick Fix**: Set up Railway persistent volume (Steps 1-3 above)
2. **Long-term**: Consider migrating to cloud storage for better reliability

