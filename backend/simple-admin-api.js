const express = require('express')
const { PrismaClient } = require('@prisma/client')
const cors = require('cors')

const app = express()
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:RCXLrPMIfTGTCQJLQfHVnIOwTRTpZCBC@centerbeam.proxy.rlwy.net:47845/railway"
    }
  }
})

app.use(cors())
app.use(express.json())

// Simple admin endpoints
app.get('/api/auth/pending-users', async (req, res) => {
  try {
    console.log('🔍 Fetching pending users...')
    
    const users = await prisma.user.findMany({
      where: {
        isApproved: false,
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${users.length} pending users`)
    
    res.json({
      success: true,
      data: users
    })
    
  } catch (error) {
    console.error('❌ Error fetching pending users:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

app.get('/api/auth/all-users', async (req, res) => {
  try {
    console.log('🔍 Fetching all users...')
    
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${users.length} total users`)
    
    res.json({
      success: true,
      data: users
    })
    
  } catch (error) {
    console.error('❌ Error fetching all users:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

const PORT = process.env.PORT || 3003
app.listen(PORT, () => {
  console.log(`🔧 Simple Admin API running on port ${PORT}`)
  console.log(`📊 Pending users: http://localhost:${PORT}/api/auth/pending-users`)
  console.log(`👥 All users: http://localhost:${PORT}/api/auth/all-users`)
})
