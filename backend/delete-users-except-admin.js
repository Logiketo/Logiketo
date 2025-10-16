const { PrismaClient } = require('@prisma/client')

async function deleteUsersExceptAdmin() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
      }
    }
  })
  
  try {
    console.log('🔍 Connecting to production database...')
    await prisma.$connect()
    console.log('✅ Connected to production database')
    
    // First, let's see all current users
    const allUsers = await prisma.user.findMany()
    console.log(`\n📊 Current users in database: ${allUsers.length}`)
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })
    
    // Find the admin user (sales@logiketo.com)
    const adminUser = await prisma.user.findUnique({
      where: { email: 'sales@logiketo.com' }
    })
    
    if (!adminUser) {
      console.log('❌ Admin user (sales@logiketo.com) not found! Aborting deletion.')
      return
    }
    
    console.log(`\n✅ Found admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`)
    
    // Delete all users except the admin
    const usersToDelete = allUsers.filter(user => user.email !== 'sales@logiketo.com')
    
    if (usersToDelete.length === 0) {
      console.log('✅ No users to delete. Only admin user exists.')
      return
    }
    
    console.log(`\n🗑️ Deleting ${usersToDelete.length} users...`)
    
    for (const user of usersToDelete) {
      console.log(`   Deleting: ${user.firstName} ${user.lastName} (${user.email})`)
      await prisma.user.delete({
        where: { id: user.id }
      })
    }
    
    console.log(`\n✅ Successfully deleted ${usersToDelete.length} users`)
    
    // Verify the deletion
    const remainingUsers = await prisma.user.findMany()
    console.log(`\n📊 Remaining users: ${remainingUsers.length}`)
    
    remainingUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`)
    })
    
    if (remainingUsers.length === 1 && remainingUsers[0].email === 'sales@logiketo.com') {
      console.log('\n🎉 SUCCESS: Only admin user remains!')
    } else {
      console.log('\n⚠️ WARNING: Unexpected users still exist')
    }
    
    await prisma.$disconnect()
    console.log('\n✅ Database disconnected')
    
  } catch (error) {
    console.error('❌ Error:', error)
    await prisma.$disconnect()
  }
}

deleteUsersExceptAdmin()
