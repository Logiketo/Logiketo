// One-time script to add IN_TRANSIT to OrderStatus enum
// Run this on Railway: node fix-in-transit-enum.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixEnum() {
  try {
    console.log('Adding IN_TRANSIT to OrderStatus enum...')
    
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
          AND enumlabel = 'IN_TRANSIT'
        ) THEN
          ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
          RAISE NOTICE 'IN_TRANSIT added to OrderStatus enum';
        ELSE
          RAISE NOTICE 'IN_TRANSIT already exists in OrderStatus enum';
        END IF;
      END $$;
    `)
    
    console.log('✅ Done! IN_TRANSIT should now work.')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixEnum()

