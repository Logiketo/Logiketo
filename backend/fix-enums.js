const { Client } = require('pg')

async function createEnums() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  
  try {
    await client.connect()
    console.log('🔧 Connected to database, creating enums...')
    
    // Create Priority enum
    await client.query('CREATE TYPE IF NOT EXISTS "public"."Priority" AS ENUM (\'LOW\', \'NORMAL\', \'HIGH\', \'URGENT\')')
    console.log('✅ Priority enum created')
    
    // Create UserRole enum
    await client.query('CREATE TYPE IF NOT EXISTS "public"."UserRole" AS ENUM (\'ADMIN\', \'MANAGER\', \'DISPATCHER\', \'DRIVER\', \'USER\')')
    console.log('✅ UserRole enum created')
    
    // Create VehicleStatus enum
    await client.query('CREATE TYPE IF NOT EXISTS "public"."VehicleStatus" AS ENUM (\'AVAILABLE\', \'IN_USE\', \'MAINTENANCE\', \'OUT_OF_SERVICE\')')
    console.log('✅ VehicleStatus enum created')
    
    // Create OrderStatus enum
    await client.query('CREATE TYPE IF NOT EXISTS "public"."OrderStatus" AS ENUM (\'PENDING\', \'ASSIGNED\', \'IN_TRANSIT\', \'DELIVERED\', \'CANCELLED\', \'RETURNED\')')
    console.log('✅ OrderStatus enum created')
    
    // Create EmployeeStatus enum
    await client.query('CREATE TYPE IF NOT EXISTS "public"."EmployeeStatus" AS ENUM (\'ACTIVE\', \'INACTIVE\', \'TERMINATED\', \'ON_LEAVE\')')
    console.log('✅ EmployeeStatus enum created')
    
    console.log('🎉 All enums created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating enums:', error.message)
  } finally {
    await client.end()
  }
}

createEnums()
