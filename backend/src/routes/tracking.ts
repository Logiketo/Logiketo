import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Get tracking events for an order
router.get('/order/:orderId', authenticate, async (req: AuthRequest, res) => {
  try {
    const orderId = req.params.orderId

    // Verify order belongs to this account (via customer)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { createdById: true } } }
    })
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }
    if (order.customer.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const trackingEvents = await prisma.trackingEvent.findMany({
      where: {
        orderId
      },
      orderBy: {
        timestamp: 'desc'
      }
    })

    return res.json({
      success: true,
      data: trackingEvents
    })
  } catch (error) {
    console.error('Get tracking events error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
