const { PrismaClient } = require('@prisma/client')

async function makeAdminSQL() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Making user admin with SQL...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    const email = 'sales@logiketo.com'
    
    console.log(`🔍 Looking for user with email: ${email}`)
    
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { email: email }
    })
    
    if (!user) {
      console.log('❌ User not found.')
      return
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`)
    
    // Update user to admin using raw SQL
    await prisma.$executeRaw`
      UPDATE "users" 
      SET "role" = 'ADMIN', "isApproved" = true, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "email" = ${email}
    `
    
    console.log('🎉 User updated to ADMIN role!')
    console.log(`✅ ${user.firstName} ${user.lastName} is now an ADMIN`)
    console.log('✅ User is also approved and can login')
    
  } catch (error) {
    console.error('❌ Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdminSQL()
