import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { canSeeAllData } from '../utils/dataAccess'
import { z } from 'zod'

const router = express.Router()
const prisma = new PrismaClient()

function ownershipFilter(req: AuthRequest): string {
  if (canSeeAllData(req.user!.role)) return ''
  return ` AND c."createdById" = '${String(req.user!.id).replace(/'/g, "''")}'`
}

// Validation schemas
const assignOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  driverId: z.string().min(1, 'Driver ID is required')
})

const updateDispatchStatusSchema = z.object({
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  notes: z.string().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional()
  }).optional()
})

// Get dispatch dashboard data
router.get('/dashboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const of = ownershipFilter(req)
    // Use raw SQL queries to avoid enum type issues
    const [
      pendingOrdersRaw,
      activeOrdersRaw,
      availableVehicles,
      availableDrivers,
      recentDispatchesRaw
    ] = await Promise.all([
      // Pending orders (ready for dispatch) - using raw SQL
      prisma.$queryRawUnsafe(`
        SELECT 
          o.*,
          CAST(o.status AS TEXT) as status,
          CAST(o.priority AS TEXT) as priority,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'address', c.address
          ) as customer,
          CASE 
            WHEN v.id IS NOT NULL THEN json_build_object(
              'id', v.id,
              'make', v.make,
              'model', v.model,
              'licensePlate', v."licensePlate",
              'driver', CASE 
                WHEN u.id IS NOT NULL THEN json_build_object(
                  'id', u.id,
                  'firstName', u."firstName",
                  'lastName', u."lastName",
                  'email', u.email
                )
                ELSE NULL
              END
            )
            ELSE NULL
          END as vehicle
        FROM orders o
        LEFT JOIN customers c ON o."customerId" = c.id
        LEFT JOIN vehicles v ON o."vehicleId" = v.id
        LEFT JOIN users u ON v."driverId" = u.id
        WHERE CAST(o.status AS TEXT) = 'PENDING'${of}
        ORDER BY o."createdAt" DESC
        LIMIT 10
      `) as Promise<any[]>,

      // Active orders (in progress) - using raw SQL
      prisma.$queryRawUnsafe(`
        SELECT 
          o.*,
          CAST(o.status AS TEXT) as status,
          CAST(o.priority AS TEXT) as priority,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'address', c.address
          ) as customer,
          CASE 
            WHEN v.id IS NOT NULL THEN json_build_object(
              'id', v.id,
              'make', v.make,
              'model', v.model,
              'licensePlate', v."licensePlate",
              'driver', CASE 
                WHEN u.id IS NOT NULL THEN json_build_object(
                  'id', u.id,
                  'firstName', u."firstName",
                  'lastName', u."lastName",
                  'email', u.email
                )
                ELSE NULL
              END
            )
            ELSE NULL
          END as vehicle,
          (
            SELECT json_agg(
              json_build_object(
                'id', te.id,
                'status', CAST(te.status AS TEXT),
                'location', te.location,
                'timestamp', te.timestamp,
                'notes', te.notes
              )
            )
            FROM (
              SELECT * FROM tracking_events
              WHERE "orderId" = o.id
              ORDER BY timestamp DESC
              LIMIT 1
            ) te
          ) as "trackingEvents"
        FROM orders o
        LEFT JOIN customers c ON o."customerId" = c.id
        LEFT JOIN vehicles v ON o."vehicleId" = v.id
        LEFT JOIN users u ON v."driverId" = u.id
        WHERE CAST(o.status AS TEXT) IN ('ASSIGNED', 'IN_TRANSIT')${of}
        ORDER BY o."updatedAt" DESC
      `) as Promise<any[]>,

      // Available vehicles (filter by ownership for non-admin)
      prisma.vehicle.findMany({
        where: { 
          status: 'AVAILABLE',
          driver: { isNot: null },
          ...(canSeeAllData(req.user!.role) ? {} : { createdById: req.user!.id })
        },
        include: { driver: true },
        orderBy: { updatedAt: 'desc' }
      }),

      // Available drivers - employees (filter by ownership for non-admin)
      prisma.employee.findMany({
        where: { 
          status: 'ACTIVE',
          position: { contains: 'driver', mode: 'insensitive' },
          ...(canSeeAllData(req.user!.role) ? {} : { createdById: req.user!.id })
        },
        orderBy: { firstName: 'asc' }
      }),

      // Recent dispatches - using raw SQL
      prisma.$queryRawUnsafe(`
        SELECT 
          o.*,
          CAST(o.status AS TEXT) as status,
          CAST(o.priority AS TEXT) as priority,
          json_build_object(
            'id', c.id,
            'name', c.name,
            'email', c.email,
            'phone', c.phone,
            'address', c.address
          ) as customer,
          CASE 
            WHEN v.id IS NOT NULL THEN json_build_object(
              'id', v.id,
              'make', v.make,
              'model', v.model,
              'licensePlate', v."licensePlate",
              'driver', CASE 
                WHEN u.id IS NOT NULL THEN json_build_object(
                  'id', u.id,
                  'firstName', u."firstName",
                  'lastName', u."lastName",
                  'email', u.email
                )
                ELSE NULL
              END
            )
            ELSE NULL
          END as vehicle,
          (
            SELECT json_agg(
              json_build_object(
                'id', te.id,
                'status', CAST(te.status AS TEXT),
                'location', te.location,
                'timestamp', te.timestamp,
                'notes', te.notes
              )
            )
            FROM (
              SELECT * FROM tracking_events
              WHERE "orderId" = o.id
              ORDER BY timestamp DESC
              LIMIT 1
            ) te
          ) as "trackingEvents"
        FROM orders o
        LEFT JOIN customers c ON o."customerId" = c.id
        LEFT JOIN vehicles v ON o."vehicleId" = v.id
        LEFT JOIN users u ON v."driverId" = u.id
        WHERE CAST(o.status AS TEXT) IN ('ASSIGNED', 'IN_TRANSIT', 'DELIVERED')${of}
        ORDER BY o."updatedAt" DESC
        LIMIT 20
      `) as Promise<any[]>
    ])

    // Transform raw SQL results to match expected format
    const pendingOrders = (pendingOrdersRaw as any[]).map((row: any) => ({
      ...row,
      customer: row.customer,
      vehicle: row.vehicle
    }))

    const activeOrders = (activeOrdersRaw as any[]).map((row: any) => ({
      ...row,
      customer: row.customer,
      vehicle: row.vehicle,
      trackingEvents: row.trackingEvents || []
    }))

    const recentDispatches = (recentDispatchesRaw as any[]).map((row: any) => ({
      ...row,
      customer: row.customer,
      vehicle: row.vehicle,
      trackingEvents: row.trackingEvents || []
    }))

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
router.post('/assign', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedData = assignOrderSchema.parse(req.body)
    const { orderId, vehicleId, driverId } = validatedData

    // Check if order exists and is pending - using raw SQL to avoid enum issues
    const orderRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        o.*,
        c."createdById" as "customer_createdById",
        CAST(o.status AS TEXT) as status,
        CAST(o.priority AS TEXT) as priority,
        CASE 
          WHEN v.id IS NOT NULL THEN json_build_object(
            'id', v.id,
            'make', v.make,
            'model', v.model,
            'licensePlate', v."licensePlate",
            'status', CAST(v.status AS TEXT)
          )
          ELSE NULL
        END as vehicle
      FROM orders o
      LEFT JOIN customers c ON o."customerId" = c.id
      LEFT JOIN vehicles v ON o."vehicleId" = v.id
      WHERE o.id = '${orderId.replace(/'/g, "''")}'
    `) as any[]

    if (!orderRaw || orderRaw.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    const order = {
      ...orderRaw[0],
      vehicle: orderRaw[0].vehicle
    }

    if (order.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Order is not in pending status'
      })
    }

    if (!canSeeAllData(req.user!.role) && order.customer_createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
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

    if (vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not available'
      })
    }

    if (!canSeeAllData(req.user!.role) && vehicle.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You can only assign your own vehicles' })
    }

    // Check if driver exists and is available (driver is Employee)
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

    if (!canSeeAllData(req.user!.role) && driver.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You can only assign your own employees' })
    }

    // Update vehicle driver if different
    if (vehicle.driverId !== driverId) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { driverId }
      })
    }

    // Update order status and assign vehicle - using raw SQL for update
    await prisma.$executeRawUnsafe(`
      UPDATE orders 
      SET status = 'ASSIGNED'::"OrderStatus",
          "vehicleId" = '${vehicleId.replace(/'/g, "''")}',
          "updatedAt" = NOW()
      WHERE id = '${orderId.replace(/'/g, "''")}'
    `)

    // Fetch updated order with relations using raw SQL
    const updatedOrderRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        o.*,
        CAST(o.status AS TEXT) as status,
        CAST(o.priority AS TEXT) as priority,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'phone', c.phone
        ) as customer,
        CASE 
          WHEN v.id IS NOT NULL THEN json_build_object(
            'id', v.id,
            'make', v.make,
            'model', v.model,
            'licensePlate', v."licensePlate",
            'driver', CASE 
              WHEN u.id IS NOT NULL THEN json_build_object(
                'id', u.id,
                'firstName', u."firstName",
                'lastName', u."lastName",
                'email', u.email
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END as vehicle
      FROM orders o
      LEFT JOIN customers c ON o."customerId" = c.id
      LEFT JOIN vehicles v ON o."vehicleId" = v.id
      LEFT JOIN users u ON v."driverId" = u.id
      WHERE o.id = '${orderId.replace(/'/g, "''")}'
    `) as any[]

    const updatedOrder = {
      ...updatedOrderRaw[0],
      customer: updatedOrderRaw[0].customer,
      vehicle: updatedOrderRaw[0].vehicle
    }

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        orderId,
        status: 'ASSIGNED',
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
router.patch('/:orderId/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params
    const validatedData = updateDispatchStatusSchema.parse(req.body)
    const { status, notes, location } = validatedData

    // Check if order exists - using raw SQL to avoid enum issues
    const orderRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        o.*,
        c."createdById" as "customer_createdById",
        CAST(o.status AS TEXT) as status,
        o."vehicleId"
      FROM orders o
      LEFT JOIN customers c ON o."customerId" = c.id
      WHERE o.id = '${orderId.replace(/'/g, "''")}'
    `) as any[]

    if (!orderRaw || orderRaw.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    const order = orderRaw[0]
    if (!canSeeAllData(req.user!.role) && order.customer_createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    // Update order status - using raw SQL
    await prisma.$executeRawUnsafe(`
      UPDATE orders 
      SET status = '${status.replace(/'/g, "''")}'::"OrderStatus",
          "updatedAt" = NOW()
      WHERE id = '${orderId.replace(/'/g, "''")}'
    `)

    // Fetch updated order with relations using raw SQL
    const updatedOrderRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        o.*,
        CAST(o.status AS TEXT) as status,
        CAST(o.priority AS TEXT) as priority,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'email', c.email,
          'phone', c.phone
        ) as customer,
        CASE 
          WHEN v.id IS NOT NULL THEN json_build_object(
            'id', v.id,
            'make', v.make,
            'model', v.model,
            'licensePlate', v."licensePlate",
            'driver', CASE 
              WHEN u.id IS NOT NULL THEN json_build_object(
                'id', u.id,
                'firstName', u."firstName",
                'lastName', u."lastName",
                'email', u.email
              )
              ELSE NULL
            END
          )
          ELSE NULL
        END as vehicle
      FROM orders o
      LEFT JOIN customers c ON o."customerId" = c.id
      LEFT JOIN vehicles v ON o."vehicleId" = v.id
      LEFT JOIN users u ON v."driverId" = u.id
      WHERE o.id = '${orderId.replace(/'/g, "''")}'
    `) as any[]

    const updatedOrder = {
      ...updatedOrderRaw[0],
      customer: updatedOrderRaw[0].customer,
      vehicle: updatedOrderRaw[0].vehicle
    }

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
    if (status === 'DELIVERED' && order.vehicleId) {
      await prisma.$executeRawUnsafe(`
        UPDATE vehicles 
        SET status = 'AVAILABLE'::"VehicleStatus"
        WHERE id = '${order.vehicleId.replace(/'/g, "''")}'
      `)
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
router.get('/track/:orderId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { orderId } = req.params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true, createdById: true } },
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

    if (!canSeeAllData(req.user!.role) && order.customer.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
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
router.get('/vehicles/available', authenticate, async (req: AuthRequest, res) => {
  try {
    const vFilter = canSeeAllData(req.user!.role) ? '' : ` AND v."createdById" = '${String(req.user!.id).replace(/'/g, "''")}'`
    // Use raw SQL to avoid enum issues with orders.status
    const vehiclesRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        v.*,
        CAST(v.status AS TEXT) as status,
        CASE 
          WHEN u.id IS NOT NULL THEN json_build_object(
            'id', u.id,
            'firstName', u."firstName",
            'lastName', u."lastName",
            'email', u.email
          )
          ELSE NULL
        END as driver,
        (
          SELECT json_agg(
            json_build_object(
              'id', o.id,
              'orderNumber', o."orderNumber",
              'status', CAST(o.status AS TEXT),
              'pickupAddress', o."pickupAddress",
              'deliveryAddress', o."deliveryAddress"
            )
          )
          FROM orders o
          WHERE o."vehicleId" = v.id 
            AND CAST(o.status AS TEXT) IN ('ASSIGNED', 'IN_TRANSIT')
        ) as orders
      FROM vehicles v
      LEFT JOIN users u ON v."driverId" = u.id
      WHERE CAST(v.status AS TEXT) = 'AVAILABLE'
        AND v."driverId" IS NOT NULL${vFilter}
      ORDER BY v."updatedAt" DESC
    `) as any[]

    const vehicles = vehiclesRaw.map((row: any) => ({
      ...row,
      driver: row.driver,
      orders: row.orders || []
    }))

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
router.get('/drivers/available', authenticate, async (req: AuthRequest, res) => {
  try {
    const drivers = await prisma.employee.findMany({
      where: { 
        status: 'ACTIVE',
        position: { contains: 'driver', mode: 'insensitive' },
        ...(canSeeAllData(req.user!.role) ? {} : { createdById: req.user!.id })
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
