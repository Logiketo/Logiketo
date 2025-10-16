const { PrismaClient } = require('@prisma/client')

async function checkProductionUsers() {
  // Use production database URL
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@postgres.railway.internal:5432/railway"
      }
    }
  })
  
  try {
    console.log('🔄 Checking production database users...')
    await prisma.$connect()
    console.log('✅ Production database connected')
    
    // Get all users from production
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total users in PRODUCTION database: ${users.length}`)
    console.log('')
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Approved: ${user.isApproved}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })
    
    await prisma.$disconnect()
    console.log('✅ Production database disconnected')
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

checkProductionUsers()
