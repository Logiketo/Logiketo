// Add this to your backend/src/routes/auth.ts or create a new monitoring route

const express = require('express')
const { PrismaClient } = require('@prisma/client')
const router = express.Router()
const prisma = new PrismaClient()

// Add this route to your existing backend
router.get('/monitor/users', async (req, res) => {
  try {
    console.log('🔍 Production user monitoring request')
    
    // Get all users with detailed info
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isApproved: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    console.log(`📊 Production database has ${users.length} users`)
    
    // Log each user for debugging
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${user.role} - Approved: ${user.isApproved}`)
    })
    
    res.json({
      success: true,
      totalUsers: users.length,
      users: users,
      database: 'Production Railway Database',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Production user monitoring error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to get users from production database'
    })
  }
})

// Add this route to get database connection info
router.get('/monitor/database', async (req, res) => {
  try {
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`
    
    res.json({
      success: true,
      databaseInfo: dbInfo[0],
      userCount: userCount[0].count,
      connectionString: process.env.DATABASE_URL ? 'Set' : 'Not set',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

module.exports = router
