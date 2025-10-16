const { PrismaClient } = require('@prisma/client')

async function searchUsers() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Searching for specific users...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Search for the specific email addresses
    const emails = ['sasa1212@logiketo.com', 'sasa112@logiketo.com']
    
    for (const email of emails) {
      console.log(`\n🔍 Searching for: ${email}`)
      const user = await prisma.user.findUnique({
        where: { email: email }
      })
      
      if (user) {
        console.log(`✅ Found user:`)
        console.log(`   Name: ${user.firstName} ${user.lastName}`)
        console.log(`   Email: ${user.email}`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Approved: ${user.isApproved}`)
        console.log(`   Active: ${user.isActive}`)
        console.log(`   Created: ${user.createdAt}`)
        console.log(`   Updated: ${user.updatedAt}`)
      } else {
        console.log(`❌ User not found: ${email}`)
      }
    }
    
    // Also search for any users with similar email patterns
    console.log(`\n🔍 Searching for users with 'sasa' in email...`)
    const sasaUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: 'sasa'
        }
      }
    })
    
    if (sasaUsers.length > 0) {
      console.log(`✅ Found ${sasaUsers.length} users with 'sasa' in email:`)
      sasaUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
      })
    } else {
      console.log(`❌ No users found with 'sasa' in email`)
    }
    
    await prisma.$disconnect()
    console.log('\n✅ Database disconnected')
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

searchUsers()
