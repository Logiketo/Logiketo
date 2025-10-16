const { PrismaClient } = require('@prisma/client')

async function checkProductionUsers() {
  console.log('🔍 CHECKING PRODUCTION USERS (PUBLIC URL)')
  console.log('==========================================')
  
  // Use the public database URL from Railway
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
      }
    }
  })
  
  try {
    console.log('🔄 Connecting to production database via public URL...')
    await prisma.$connect()
    console.log('✅ Connected to production database')
    
    // Get all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📊 TOTAL USERS IN PRODUCTION: ${users.length}`)
    console.log('=====================================')
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Approved: ${user.isApproved ? '✅ YES' : '❌ NO'}`)
      console.log(`   Active: ${user.isActive ? '✅ YES' : '❌ NO'}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
    })
    
    // Summary
    const approvedUsers = users.filter(u => u.isApproved)
    const activeUsers = users.filter(u => u.isActive)
    const adminUsers = users.filter(u => u.role === 'ADMIN')
    
    console.log('\n📈 SUMMARY:')
    console.log(`   Total Users: ${users.length}`)
    console.log(`   Approved Users: ${approvedUsers.length}`)
    console.log(`   Active Users: ${activeUsers.length}`)
    console.log(`   Admin Users: ${adminUsers.length}`)
    
    await prisma.$disconnect()
    console.log('\n✅ Database disconnected')
    
  } catch (error) {
    console.error('❌ Error connecting to production database:', error.message)
    console.log('\n🔧 TROUBLESHOOTING:')
    console.log('1. Check if Railway database is running')
    console.log('2. Verify database credentials')
    console.log('3. Check network connectivity')
  }
}

checkProductionUsers()
