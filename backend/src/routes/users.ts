import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Get all users
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      data: users
    })
    return
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })
    return
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

export default router
