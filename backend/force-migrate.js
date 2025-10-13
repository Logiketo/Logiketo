const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

async function forceMigrate() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Force running database migrations...')
    
    // Connect to database
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Run migrations
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Migrations completed')
    
    // Test by creating a test user
    try {
      const testUser = await prisma.user.findFirst()
      console.log('✅ Users table exists')
    } catch (error) {
      console.log('❌ Users table does not exist')
    }
    
    await prisma.$disconnect()
    console.log('✅ Migration process complete')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

forceMigrate()
