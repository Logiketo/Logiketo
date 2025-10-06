import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const reportQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', '10year', '100year', 'custom']).default('week'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
})

// Helper function to get date range based on period
const getDateRange = (period: string, startDate?: string, endDate?: string) => {
  const now = new Date()
  let start: Date
  let end: Date = now

  switch (period) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case '10year':
      start = new Date(now.getFullYear() - 10, 0, 1)
      break
    case '100year':
      start = new Date(now.getFullYear() - 100, 0, 1)
      break
    case 'custom':
      if (startDate && endDate) {
        start = new Date(startDate)
        end = new Date(endDate)
      } else {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }
      break
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { start, end }
}

// Loads calculation with quantity and pay
router.get('/loads', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate, limit } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    const loadsData = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate totals
    const totalQuantity = loadsData.length
    const totalLoadPay = loadsData.reduce((sum, order) => sum + (order.loadPay || 0), 0)
    const totalDriverPay = loadsData.reduce((sum, order) => sum + (order.driverPay || 0), 0)
    const totalMiles = loadsData.reduce((sum, order) => sum + (order.miles || 0), 0)
    const totalWeight = loadsData.reduce((sum, order) => sum + (order.weight || 0), 0)

    // Status breakdown
    const statusBreakdown = loadsData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        summary: {
          totalQuantity,
          totalLoadPay,
          totalDriverPay,
          totalMiles,
          totalWeight,
          averageLoadPay: totalQuantity > 0 ? totalLoadPay / totalQuantity : 0,
          averageDriverPay: totalQuantity > 0 ? totalDriverPay / totalQuantity : 0
        },
        statusBreakdown,
        loads: loadsData.slice(0, limit)
      }
    })
  } catch (error) {
    console.error('Loads report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Top customers calculation with quantity and pay
router.get('/top-customers', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate, limit } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    const customerStats = await prisma.customer.findMany({
      include: {
        orders: {
          where: {
            createdAt: {
              gte: start,
              lte: end
            }
          },
          select: {
            id: true,
            loadPay: true,
            driverPay: true,
            status: true,
            createdAt: true
          }
        }
      }
    })

    const topCustomers = customerStats
      .map(customer => {
        const orders = customer.orders
        const totalLoadPay = orders.reduce((sum, order) => sum + (order.loadPay || 0), 0)
        const totalDriverPay = orders.reduce((sum, order) => sum + (order.driverPay || 0), 0)
        const deliveredOrders = orders.filter(order => order.status === 'DELIVERED').length

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          totalOrders: orders.length,
          deliveredOrders,
          totalLoadPay,
          totalDriverPay,
          averageLoadPay: orders.length > 0 ? totalLoadPay / orders.length : 0,
          lastOrderDate: orders.length > 0 ? orders.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt : null
        }
      })
      .filter(customer => customer.totalOrders > 0)
      .sort((a, b) => b.totalLoadPay - a.totalLoadPay)
      .slice(0, limit)

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        topCustomers
      }
    })
  } catch (error) {
    console.error('Top customers report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Top employees calculation with loads and pay
router.get('/top-employees', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate, limit } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    // Get all employees
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        department: true
      }
    })

    // Get orders for the period with employee information
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        employeeId: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        loadPay: true,
        driverPay: true,
        status: true,
        createdAt: true
      }
    })

    // Group orders by employee
    const employeeOrdersMap = new Map<string, typeof orders>()
    orders.forEach(order => {
      if (order.employeeId) {
        if (!employeeOrdersMap.has(order.employeeId)) {
          employeeOrdersMap.set(order.employeeId, [])
        }
        employeeOrdersMap.get(order.employeeId)!.push(order)
      }
    })

    const topEmployees = employees
      .map(employee => {
        const employeeOrders = employeeOrdersMap.get(employee.id) || []
        const totalLoadPay = employeeOrders.reduce((sum: number, order: any) => sum + (order.loadPay || 0), 0)
        const totalDriverPay = employeeOrders.reduce((sum: number, order: any) => sum + (order.driverPay || 0), 0)
        const deliveredOrders = employeeOrders.filter((order: any) => order.status === 'DELIVERED').length

        return {
          id: employee.id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          totalOrders: employeeOrders.length,
          deliveredOrders,
          totalLoadPay,
          totalDriverPay,
          averageLoadPay: employeeOrders.length > 0 ? totalLoadPay / employeeOrders.length : 0,
          lastOrderDate: employeeOrders.length > 0 ? employeeOrders.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt : null
        }
      })
      .filter(employee => employee.totalOrders > 0)
      .sort((a, b) => b.totalLoadPay - a.totalLoadPay)
      .slice(0, limit)

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        topEmployees
      }
    })
  } catch (error) {
    console.error('Top employees report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Top units calculation with quantity and pay
router.get('/top-units', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate, limit } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    // Get all units with their vehicles
    const units = await prisma.unit.findMany({
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            year: true
          }
        }
      }
    })

    // Get orders for the period with vehicle information
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        },
        vehicleId: {
          not: null
        }
      },
      select: {
        id: true,
        vehicleId: true,
        loadPay: true,
        driverPay: true,
        status: true,
        createdAt: true,
        miles: true,
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true
          }
        }
      }
    })

    // Group orders by vehicle/unit
    const unitOrdersMap = new Map<string, typeof orders>()
    orders.forEach(order => {
      if (order.vehicleId) {
        if (!unitOrdersMap.has(order.vehicleId)) {
          unitOrdersMap.set(order.vehicleId, [])
        }
        unitOrdersMap.get(order.vehicleId)!.push(order)
      }
    })

    const topUnits = units
      .map(unit => {
        const unitOrders = unitOrdersMap.get(unit.vehicle.id) || []
        const totalLoadPay = unitOrders.reduce((sum: number, order: any) => sum + (order.loadPay || 0), 0)
        const totalDriverPay = unitOrders.reduce((sum: number, order: any) => sum + (order.driverPay || 0), 0)
        const totalMiles = unitOrders.reduce((sum: number, order: any) => sum + (order.miles || 0), 0)
        const deliveredOrders = unitOrders.filter((order: any) => order.status === 'DELIVERED').length

        return {
          id: unit.id,
          unitNumber: unit.unitNumber,
          name: unit.name,
          vehicle: `${unit.vehicle.make} ${unit.vehicle.model}`,
          licensePlate: unit.vehicle.licensePlate,
          totalOrders: unitOrders.length,
          deliveredOrders,
          totalLoadPay,
          totalDriverPay,
          totalMiles,
          averageLoadPay: unitOrders.length > 0 ? totalLoadPay / unitOrders.length : 0,
          lastOrderDate: unitOrders.length > 0 ? unitOrders.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0].createdAt : null
        }
      })
      .filter(unit => unit.totalOrders > 0)
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, limit)

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        topUnits
      }
    })
  } catch (error) {
    console.error('Top units report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// New items calculation - comprehensive overview
router.get('/new-items', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate, limit } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    // Get new units
    const newUnits = await prisma.unit.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            year: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get new customers
    const newCustomers = await prisma.customer.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get new employees
    const newEmployees = await prisma.employee.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        position: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get new vehicles
    const newVehicles = await prisma.vehicle.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        make: true,
        model: true,
        licensePlate: true,
        year: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    // Get counts
    const [
      totalNewUnits,
      totalNewCustomers,
      totalNewEmployees,
      totalNewVehicles,
      activeUnits,
      totalUnits
    ] = await Promise.all([
      prisma.unit.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.customer.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.employee.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.vehicle.count({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      }),
      prisma.unit.count({
        where: {
          isActive: true
        }
      }),
      prisma.unit.count()
    ])

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        summary: {
          totalNewUnits,
          totalNewCustomers,
          totalNewEmployees,
          totalNewVehicles,
          activeUnits,
          totalUnits,
          inactiveUnits: totalUnits - activeUnits
        },
        newUnits,
        newCustomers,
        newEmployees,
        newVehicles
      }
    })
  } catch (error) {
    console.error('New items report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Comprehensive analytics dashboard
router.get('/analytics', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period, startDate, endDate } = reportQuerySchema.parse(req.query)
    const { start, end } = getDateRange(period, startDate, endDate)

    // Get all analytics data in parallel
    const [
      totalOrders,
      totalCustomers,
      totalEmployees,
      totalDrivers,
      totalVehicles,
      totalUnits,
      ordersInPeriod,
      revenueData,
      statusBreakdown
    ] = await Promise.all([
      prisma.order.count(),
      prisma.customer.count(),
      prisma.employee.count(),
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.vehicle.count(),
      prisma.unit.count(),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        select: {
          loadPay: true,
          driverPay: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _sum: {
          loadPay: true,
          driverPay: true
        }
      }),
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        _count: {
          id: true
        }
      })
    ])

    const totalRevenue = revenueData._sum.loadPay || 0
    const totalDriverPay = revenueData._sum.driverPay || 0
    const netRevenue = totalRevenue - totalDriverPay

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start, end },
        overview: {
          totalOrders,
          totalCustomers,
          totalEmployees,
          totalDrivers,
          totalVehicles,
          totalUnits
        },
        periodStats: {
          ordersInPeriod: ordersInPeriod.length,
          totalRevenue,
          totalDriverPay,
          netRevenue,
          averageOrderValue: ordersInPeriod.length > 0 ? totalRevenue / ordersInPeriod.length : 0
        },
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count.id
          return acc
        }, {} as Record<string, number>)
      }
    })
  } catch (error) {
    console.error('Analytics report error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router

