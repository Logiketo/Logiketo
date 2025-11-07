const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addInTransitEnum() {
  try {
    console.log('🔧 Adding IN_TRANSIT to OrderStatus enum...\n')

    // Check if IN_TRANSIT already exists in the enum
    const enumCheck = await prisma.$queryRawUnsafe(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'OrderStatus'
      ) 
      AND enumlabel = 'IN_TRANSIT'
    `)

    if (enumCheck && enumCheck.length > 0) {
      console.log('✅ IN_TRANSIT already exists in OrderStatus enum\n')
      return
    }

    // Add IN_TRANSIT to the enum
    console.log('Adding IN_TRANSIT value to OrderStatus enum...')
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

    console.log('✅ IN_TRANSIT successfully added to OrderStatus enum\n')
    console.log('✅ Database fix completed!\n')

  } catch (error) {
    console.error('❌ Error adding IN_TRANSIT to enum:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addInTransitEnum()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })

