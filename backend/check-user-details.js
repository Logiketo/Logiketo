const { PrismaClient } = require('@prisma/client')

async function checkUserDetails() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
      }
    }
  })
  
  try {
    console.log('🔍 CHECKING USER DETAILS')
    console.log('========================')
    
    await prisma.$connect()
    console.log('✅ Connected to production database')
    
    // Get all users with full details
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`\n📊 TOTAL USERS: ${users.length}`)
    console.log('========================')
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. USER DETAILS:`)
      console.log(`   ID: ${user.id}`)
      console.log(`   First Name: "${user.firstName}"`)
      console.log(`   Last Name: "${user.lastName}"`)
      console.log(`   Full Name: "${user.firstName} ${user.lastName}"`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Approved: ${user.isApproved}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
    })
    
    // Check specifically for the user with email sasa1212@logiketo.com
    const specificUser = await prisma.user.findUnique({
      where: { email: 'sasa1212@logiketo.com' }
    })
    
    if (specificUser) {
      console.log('\n🔍 SPECIFIC USER FOUND:')
      console.log(`   Full Name: "${specificUser.firstName} ${specificUser.lastName}"`)
      console.log(`   Email: ${specificUser.email}`)
      console.log(`   Role: ${specificUser.role}`)
      console.log(`   Approved: ${specificUser.isApproved}`)
    }
    
    await prisma.$disconnect()
    console.log('\n✅ Database disconnected')
    
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

checkUserDetails()
