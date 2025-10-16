const { PrismaClient } = require('@prisma/client')

async function monitorUsers() {
  console.log('🔍 COMPREHENSIVE USER MONITORING')
  console.log('=====================================')
  
  // Check local database
  console.log('\n1️⃣ CHECKING LOCAL DATABASE:')
  console.log('Database URL: postgresql://postgres:First1299%23@localhost:5432/logiketo_db')
  
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:First1299%23@localhost:5432/logiketo_db"
      }
    }
  })
  
  try {
    await localPrisma.$connect()
    const localUsers = await localPrisma.user.findMany()
    console.log(`✅ Local database connected - Found ${localUsers.length} users`)
    
    localUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })
    
    await localPrisma.$disconnect()
  } catch (error) {
    console.log(`❌ Local database error: ${error.message}`)
  }
  
  // Check production database (Railway)
  console.log('\n2️⃣ CHECKING PRODUCTION DATABASE (Railway):')
  console.log('Database URL: postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@postgres.railway.internal:5432/railway')
  
  const prodPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@postgres.railway.internal:5432/railway"
      }
    }
  })
  
  try {
    await prodPrisma.$connect()
    const prodUsers = await prodPrisma.user.findMany()
    console.log(`✅ Production database connected - Found ${prodUsers.length} users`)
    
    prodUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })
    
    await prodPrisma.$disconnect()
  } catch (error) {
    console.log(`❌ Production database error: ${error.message}`)
  }
  
  // Check if there are multiple databases or schemas
  console.log('\n3️⃣ CHECKING FOR ADDITIONAL DATABASES:')
  
  // Try to connect to Railway with different connection methods
  const railwayPrisma = new PrismaClient()
  
  try {
    await railwayPrisma.$connect()
    console.log('✅ Default Prisma connection successful')
    
    // Try to get database info
    const dbInfo = await railwayPrisma.$queryRaw`SELECT current_database(), current_user, version()`
    console.log('Database info:', dbInfo)
    
    // Check all tables
    const tables = await railwayPrisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log('Available tables:', tables)
    
    await railwayPrisma.$disconnect()
  } catch (error) {
    console.log(`❌ Default connection error: ${error.message}`)
  }
  
  console.log('\n🎯 RECOMMENDATIONS:')
  console.log('1. Check Railway dashboard for database connection details')
  console.log('2. Verify which database your production app is actually using')
  console.log('3. Set up proper monitoring with Railway logs')
  console.log('4. Create a user management dashboard')
}

monitorUsers()
