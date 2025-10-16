const { PrismaClient } = require('@prisma/client')

async function getAllUsers() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Getting all users from database...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Get all users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Total users found: ${users.length}`)
    console.log('')
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Approved: ${user.isApproved}`)
      console.log(`   Active: ${user.isActive}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
      console.log('')
    })
    
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

getAllUsers()
