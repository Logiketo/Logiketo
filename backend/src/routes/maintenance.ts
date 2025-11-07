import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// One-time maintenance endpoint to fix enum types/columns on production DB
router.post('/fix-orders-schema', authenticate, async (req: AuthRequest, res) => {
  try {
    // Optional: only allow admins
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Ensure enums exist
    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      CREATE TYPE "OrderStatus" AS ENUM ('PENDING','ASSIGNED','IN_TRANSIT','DELIVERED','CANCELLED','RETURNED');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)

    await prisma.$executeRawUnsafe(`DO $$ BEGIN
      CREATE TYPE "Priority" AS ENUM ('LOW','NORMAL','HIGH','URGENT');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)

    // Convert columns
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders"
      ALTER COLUMN "status"   TYPE "OrderStatus" USING "status"::text::"OrderStatus",
      ALTER COLUMN "priority" TYPE "Priority"    USING "priority"::text::"Priority";`)

    // Set defaults
    await prisma.$executeRawUnsafe(`ALTER TABLE "orders"
      ALTER COLUMN "status"   SET DEFAULT 'PENDING'::"OrderStatus",
      ALTER COLUMN "priority" SET DEFAULT 'NORMAL'::"Priority";`)

    return res.json({ success: true, message: 'Orders schema fixed' })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

// Add missing enum values to OrderStatus
router.post('/add-enum-value', authenticate, async (req: AuthRequest, res) => {
  try {
    // Optional: only allow admins
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { value } = req.body
    if (!value) {
      return res.status(400).json({ success: false, message: 'Enum value is required' })
    }

    // Check if enum value exists
    const enumCheck = await prisma.$queryRawUnsafe(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'OrderStatus'
      ) 
      AND enumlabel = '${value.replace(/'/g, "''")}'
    `) as any[]

    if (enumCheck && enumCheck.length > 0) {
      return res.json({ success: true, message: `Enum value '${value}' already exists` })
    }

    // Add the enum value
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
          AND enumlabel = '${value.replace(/'/g, "''")}'
        ) THEN
          ALTER TYPE "OrderStatus" ADD VALUE '${value.replace(/'/g, "''")}';
        END IF;
      END $$;
    `)

    return res.json({ success: true, message: `Enum value '${value}' added successfully` })
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message })
  }
})

export default router


