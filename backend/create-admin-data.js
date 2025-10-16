const { PrismaClient } = require('@prisma/client')

async function createAdminData() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
      }
    }
  })
  
  try {
    console.log('🔍 Creating admin data file...')
    await prisma.$connect()
    
    // Get all users
    const allUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    // Get pending users
    const pendingUsers = allUsers.filter(user => !user.isApproved && user.isActive)
    
    // Create JSON data
    const adminData = {
      allUsers: allUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        isApproved: user.isApproved,
        createdAt: user.createdAt
      })),
      pendingUsers: pendingUsers.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt
      }))
    }
    
    // Write to file
    const fs = require('fs')
    fs.writeFileSync('admin-data.json', JSON.stringify(adminData, null, 2))
    
    console.log(`✅ Created admin-data.json with ${allUsers.length} total users and ${pendingUsers.length} pending users`)
    
    await prisma.$disconnect()
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

createAdminData()
