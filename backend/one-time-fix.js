const { PrismaClient } = require('@prisma/client')

async function fixDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Starting database fix...')
    await prisma.$connect()
    
    // Create all enums
    const enums = [
      { name: 'Priority', values: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] },
      { name: 'UserRole', values: ['ADMIN', 'MANAGER', 'DISPATCHER', 'DRIVER', 'USER'] },
      { name: 'VehicleStatus', values: ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'] },
      { name: 'OrderStatus', values: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED'] },
      { name: 'EmployeeStatus', values: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] }
    ]
    
    for (const enumType of enums) {
      try {
        const values = enumType.values.map(v => `'${v}'`).join(', ')
        await prisma.$executeRawUnsafe(`CREATE TYPE IF NOT EXISTS "public"."${enumType.name}" AS ENUM (${values})`)
        console.log(`✅ ${enumType.name} enum created`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️ ${enumType.name} enum already exists`)
        } else {
          console.error(`❌ Error creating ${enumType.name}:`, error.message)
        }
      }
    }
    
    console.log('🎉 Database fix completed!')
    
  } catch (error) {
    console.error('❌ Database fix failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabase()
