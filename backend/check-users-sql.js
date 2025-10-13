const { PrismaClient } = require('@prisma/client')

async function checkUsersSQL() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Checking users in database...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Get all users using raw SQL
    const users = await prisma.$queryRaw`
      SELECT id, email, "firstName", "lastName", role, "isApproved", "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
    `
    
    console.log(`📊 Found ${users.length} users:`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Approved: ${user.isApproved}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersSQL()
