const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixDatabase() {
  try {
    console.log('🔧 Starting database enum fix...\n')

    // Create OrderStatus enum if it doesn't exist
    console.log('1. Creating OrderStatus enum type...')
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `)
      console.log('   ✅ OrderStatus enum created or already exists\n')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✅ OrderStatus enum already exists\n')
      } else {
        throw error
      }
    }

    // Fix orders.status column
    console.log('2. Fixing orders.status column...')
    await prisma.$executeRawUnsafe(`
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
          RAISE NOTICE 'orders.status converted to OrderStatus enum';
        ELSE
          RAISE NOTICE 'orders.status already is OrderStatus enum';
        END IF;
      END $$;
    `)
    console.log('   ✅ orders.status column fixed\n')

    // Fix tracking_events.status column
    console.log('3. Fixing tracking_events.status column...')
    await prisma.$executeRawUnsafe(`
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
          RAISE NOTICE 'tracking_events.status converted to OrderStatus enum';
        ELSE
          RAISE NOTICE 'tracking_events.status already is OrderStatus enum';
        END IF;
      END $$;
    `)
    console.log('   ✅ tracking_events.status column fixed\n')

    console.log('✅ Database fix completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Commit and push your code changes')
    console.log('2. Railway will auto-redeploy')
    console.log('3. Your website should work! 🎉\n')

  } catch (error) {
    console.error('❌ Error fixing database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabase()

