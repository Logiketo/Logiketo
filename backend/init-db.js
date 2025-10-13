const { PrismaClient } = require('@prisma/client')

async function initDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Initializing database...')
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Try to create a test user to see if tables exist
    try {
      const testUser = await prisma.user.findFirst()
      console.log('✅ Users table exists')
    } catch (error) {
      console.log('❌ Users table does not exist, running migrations...')
      
      // Run migrations
      const { execSync } = require('child_process')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      console.log('✅ Migrations completed')
    }
    
    await prisma.$disconnect()
    console.log('✅ Database initialization complete')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()
