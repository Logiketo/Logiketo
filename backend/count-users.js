const { PrismaClient } = require('@prisma/client')

async function countUsers() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Counting users with raw SQL...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Count with raw SQL
    const result = await prisma.$queryRaw`SELECT COUNT(*) as total FROM users`
    console.log('📊 Raw SQL count:', result[0].total)
    
    // Also check if there are any users with different conditions
    const allUsers = await prisma.user.findMany()
    console.log('📊 Prisma count:', allUsers.length)
    
    // Check for any users that might be soft deleted or have different status
    const activeUsers = await prisma.user.findMany({ where: { isActive: true } })
    const inactiveUsers = await prisma.user.findMany({ where: { isActive: false } })
    
    console.log('📊 Active users:', activeUsers.length)
    console.log('📊 Inactive users:', inactiveUsers.length)
    
    await prisma.$disconnect()
    console.log('✅ Database disconnected')
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

countUsers()
