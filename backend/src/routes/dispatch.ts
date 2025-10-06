import express from 'express'
import { PrismaClient, OrderStatus, VehicleStatus } from '@prisma/client'
import { authenticate } from '../middleware/auth'
import { z } from 'zod'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const assignOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required')
})

const updateDispatchStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  notes: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional()
  }).optional()
})

// Get dispatch dashboard data
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [
      pendingOrders,
      activeOrders,
      availableVehicles,
      availableDrivers,
      recentDispatches
    ] = await Promise.all([
      // Pending orders (ready for dispatch)
      prisma.order.findMany({
        where: { status: OrderStatus.PENDING },
        include: {
          customer: true,
          vehicle: {
            include: { driver: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Active orders (in progress)
      prisma.order.findMany({
        where: { 
          status: { 
            in: [OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT] 
          } 
        },
        include: {
          customer: true,
          vehicle: {
            include: { driver: true }
          },
          trackingEvents: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),

      // Available vehicles
      prisma.vehicle.findMany({
        where: { 
          status: VehicleStatus.AVAILABLE,
          driver: { isNot: null }
        },
        include: { driver: true },
        orderBy: { updatedAt: 'desc' }
      }),

      // Available drivers (employees who are drivers)
      prisma.employee.findMany({
        where: { 
          status: 'ACTIVE',
          position: { contains: 'driver', mode: 'insensitive' }
        },
        orderBy: { firstName: 'asc' }
      }),

      // Recent dispatches
      prisma.order.findMany({
        where: { 
          status: { 
            in: [OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED] 
          } 
        },
        include: {
          customer: true,
          vehicle: {
            include: { driver: true }
          },
          trackingEvents: {
            orderBy: { timestamp: 'desc' },
            take: 1
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      })
    ])

    return res.json({
      success: true,
      data: {
        pendingOrders,
        activeOrders,
        availableVehicles,
        availableDrivers,
        recentDispatches,
        stats: {
          pendingCount: pendingOrders.length,
          activeCount: activeOrders.length,
          availableVehiclesCount: availableVehicles.length,
          availableDriversCount: availableDrivers.length
        }
      }
    })
  } catch (error) {
    console.error('Get dispatch dashboard error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Assign order to vehicle and driver
router.post('/assign', authenticate, async (req, res) => {
  try {
    const validatedData = assignOrderSchema.parse(req.body)
    const { orderId, vehicleId, driverId } = validatedData

    // Check if order exists and is pending
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { vehicle: true }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    if (order.status !== OrderStatus.PENDING) {
      return res.status(400).json({
        success: false,
        message: 'Order is not in pending status'
      })
    }

    // Check if vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { driver: true }
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    if (vehicle.status !== VehicleStatus.AVAILABLE) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not available'
      })
    }

    // Check if driver exists and is available
    const driver = await prisma.employee.findUnique({
      where: { id: driverId }
    })

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      })
    }

    if (driver.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Driver is not active'
      })
    }

    // Update vehicle driver if different
    if (vehicle.driverId !== driverId) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { driverId }
      })
    }

    // Update order status and assign vehicle
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.ASSIGNED,
        vehicleId,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        vehicle: {
          include: { driver: true }
        }
      }
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        orderId,
        status: OrderStatus.ASSIGNED,
        notes: `Order assigned to vehicle ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) with driver ${driver.firstName} ${driver.lastName}`,
        location: order.pickupAddress,
        timestamp: new Date()
      }
    })

    return res.json({
      success: true,
      data: updatedOrder,
      message: 'Order assigned successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Assign order error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Update dispatch status (for real-time tracking)
router.patch('/:orderId/status', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params
    const validatedData = updateDispatchStatusSchema.parse(req.body)
    const { status, notes, location } = validatedData

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date()
      },
      include: {
        customer: true,
        vehicle: {
          include: { driver: true }
        }
      }
    })

    // Create tracking event
    const trackingData: any = {
      orderId,
      status,
      notes: notes || `Order status updated to ${status}`,
      timestamp: new Date()
    }

    if (location) {
      trackingData.location = location
    }

    await prisma.trackingEvent.create({
      data: trackingData
    })

    // If order is delivered, mark vehicle as available
    if (status === OrderStatus.DELIVERED) {
      await prisma.vehicle.update({
        where: { id: order.vehicleId! },
        data: { status: VehicleStatus.AVAILABLE }
      })
    }

    return res.json({
      success: true,
      data: updatedOrder,
      message: 'Order status updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Update dispatch status error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get order tracking details
router.get('/track/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        vehicle: {
          include: { driver: true }
        },
        trackingEvents: {
          orderBy: { timestamp: 'asc' }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    return res.json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Get order tracking error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get available vehicles for dispatch
router.get('/vehicles/available', authenticate, async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { 
        status: VehicleStatus.AVAILABLE,
        driver: { isNot: null }
      },
      include: { 
        driver: true,
        orders: {
          where: {
            status: { in: [OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT] }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    return res.json({
      success: true,
      data: vehicles
    })
  } catch (error) {
    console.error('Get available vehicles error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get available drivers
router.get('/drivers/available', authenticate, async (req, res) => {
  try {
    const drivers = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE',
        position: { contains: 'driver', mode: 'insensitive' }
      },
      orderBy: { firstName: 'asc' }
    })

    return res.json({
      success: true,
      data: drivers
    })
  } catch (error) {
    console.error('Get available drivers error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
