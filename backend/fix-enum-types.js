const { PrismaClient } = require('@prisma/client')

async function fixEnumTypes() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Fixing database enum types...')
    
    // Step 1: Create enum types if they don't exist
    console.log('📝 Creating enum types...')
    
    // Helper function to create enum type safely
    const createEnumIfNotExists = async (enumName, values) => {
      try {
        const exists = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = '${enumName}'
          ) as exists
        `)
        
        if (exists && exists.length > 0 && !exists[0].exists) {
          await prisma.$executeRawUnsafe(`
            CREATE TYPE "${enumName}" AS ENUM (${values.map(v => `'${v}'`).join(', ')})
          `)
          return true
        }
        return false
      } catch (error) {
        // Type might already exist, which is fine
        if (error.message.includes('already exists')) {
          return false
        }
        throw error
      }
    }
    
    await createEnumIfNotExists('Priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    console.log('✅ Priority enum created/verified')
    
    await createEnumIfNotExists('UserRole', ['ADMIN', 'MANAGER', 'DISPATCHER', 'DRIVER', 'USER'])
    console.log('✅ UserRole enum created/verified')
    
    await createEnumIfNotExists('VehicleStatus', ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'])
    console.log('✅ VehicleStatus enum created/verified')
    
    await createEnumIfNotExists('OrderStatus', ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'])
    console.log('✅ OrderStatus enum created/verified')
    
    await createEnumIfNotExists('EmployeeStatus', ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'])
    console.log('✅ EmployeeStatus enum created/verified')
    
    // Step 2: Check and fix orders.status column type
    console.log('🔍 Checking orders.status column type...')
    const ordersStatusCheck = await prisma.$queryRawUnsafe(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name = 'status'
    `)
    
    console.log('Current orders.status type:', ordersStatusCheck)
    
    if (ordersStatusCheck && ordersStatusCheck.length > 0) {
      const currentType = ordersStatusCheck[0].udt_name
      if (currentType !== 'OrderStatus') {
        console.log(`⚠️  Converting orders.status from ${currentType} to OrderStatus enum...`)
        try {
          await prisma.$executeRawUnsafe(`
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
            END
          `)
          console.log('✅ orders.status converted to OrderStatus enum')
        } catch (error) {
          console.error('❌ Error converting orders.status:', error.message)
        }
      } else {
        console.log('✅ orders.status is already OrderStatus enum')
      }
    }
    
    // Step 3: Check and fix tracking_events.status column type
    console.log('🔍 Checking tracking_events.status column type...')
    const trackingStatusCheck = await prisma.$queryRawUnsafe(`
      SELECT data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'tracking_events' AND column_name = 'status'
    `)
    
    if (trackingStatusCheck && trackingStatusCheck.length > 0) {
      const currentType = trackingStatusCheck[0].udt_name
      if (currentType !== 'OrderStatus') {
        console.log(`⚠️  Converting tracking_events.status from ${currentType} to OrderStatus enum...`)
        try {
          await prisma.$executeRawUnsafe(`
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
            END
          `)
          console.log('✅ tracking_events.status converted to OrderStatus enum')
        } catch (error) {
          console.error('❌ Error converting tracking_events.status:', error.message)
        }
      } else {
        console.log('✅ tracking_events.status is already OrderStatus enum')
      }
    }
    
    console.log('🎉 Enum types fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing enum types:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixEnumTypes()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })

