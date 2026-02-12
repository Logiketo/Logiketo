const { PrismaClient } = require('@prisma/client')

async function fixDatabaseEnums() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Fixing database enums...')
    
    // Create Priority enum
    await prisma.$executeRaw`CREATE TYPE IF NOT EXISTS "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT')`
    console.log('✅ Priority enum created')
    
    // Create UserRole enum
    await prisma.$executeRaw`CREATE TYPE IF NOT EXISTS "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'DISPATCHER', 'DRIVER', 'USER')`
    console.log('✅ UserRole enum created')
    
    // Create VehicleStatus enum
    await prisma.$executeRaw`CREATE TYPE IF NOT EXISTS "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE')`
    console.log('✅ VehicleStatus enum created')
    
    // Create OrderStatus enum
    await prisma.$executeRaw`CREATE TYPE IF NOT EXISTS "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED')`
    console.log('✅ OrderStatus enum created')
    
    // Create EmployeeStatus enum
    await prisma.$executeRaw`CREATE TYPE IF NOT EXISTS "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE')`
    console.log('✅ EmployeeStatus enum created')
    
    console.log('🎉 All enums created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating enums:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabaseEnums()
