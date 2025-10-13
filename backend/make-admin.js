const { PrismaClient } = require('@prisma/client')

async function makeAdmin() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Making user admin...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Get your email from the command line argument or use a default
    const email = process.argv[2] || 'your-email@example.com'
    
    console.log(`🔍 Looking for user with email: ${email}`)
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email }
    })
    
    if (!user) {
      console.log('❌ User not found. Please provide your email as an argument:')
      console.log('node make-admin.js your-email@example.com')
      return
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName}`)
    
    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { 
        role: 'ADMIN',
        isApproved: true  // Also approve the user
      }
    })
    
    console.log('🎉 User updated to ADMIN role!')
    console.log(`✅ ${updatedUser.firstName} ${updatedUser.lastName} is now an ADMIN`)
    console.log('✅ User is also approved and can login')
    
  } catch (error) {
    console.error('❌ Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin()
