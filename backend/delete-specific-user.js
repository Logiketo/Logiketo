const { PrismaClient } = require('@prisma/client')

async function deleteSpecificUser() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
      }
    }
  })
  
  try {
    console.log('🔍 Deleting user: sasa1212@logiketo.com')
    await prisma.$connect()
    console.log('✅ Connected to production database')
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'sasa1212@logiketo.com' }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log(`📋 Found user: ${user.firstName} ${user.lastName} (${user.email})`)
    
    // Delete the user
    await prisma.user.delete({
      where: { id: user.id }
    })
    
    console.log('✅ User deleted successfully')
    
    // Verify deletion
    const remainingUsers = await prisma.user.findMany()
    console.log(`\n📊 Remaining users: ${remainingUsers.length}`)
    
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })
    
    await prisma.$disconnect()
    console.log('\n✅ Database disconnected')
    
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

deleteSpecificUser()
