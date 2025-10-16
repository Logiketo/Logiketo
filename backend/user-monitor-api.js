const express = require('express')
const { PrismaClient } = require('@prisma/client')
const cors = require('cors')

const app = express()
const prisma = new PrismaClient()

app.use(cors())
app.use(express.json())

// User monitoring endpoint
app.get('/api/monitor/users', async (req, res) => {
  try {
    console.log('🔍 User monitoring request received')
    
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    })
    
    console.log(`📊 Found ${users.length} users in database`)
    
    const userData = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
    
    res.json({
      success: true,
      totalUsers: users.length,
      users: userData,
      database: 'Production Railway Database',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ User monitoring error:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      database: 'Production Railway Database'
    })
  }
})

// Database info endpoint
app.get('/api/monitor/database', async (req, res) => {
  try {
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`
    const tableCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`
    
    res.json({
      success: true,
      databaseInfo: dbInfo[0],
      userCount: tableCount[0].count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`🔍 User Monitor API running on port ${PORT}`)
  console.log(`📊 Monitor users: http://localhost:${PORT}/api/monitor/users`)
  console.log(`🗄️ Database info: http://localhost:${PORT}/api/monitor/database`)
})
