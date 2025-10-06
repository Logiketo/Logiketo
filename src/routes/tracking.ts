import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Get tracking events for an order
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        orderId: req.params.orderId
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    res.json({
      success: true,
      data: trackingEvents
    })
  } catch (error) {
    console.error('Get tracking events error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
