import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const createUnitSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  unitNumber: z.string().min(1, 'Unit number is required'),
  name: z.string().min(1, 'Unit name is required'),
  dimensions: z.string().optional(),
  payload: z.string().optional(),
  notes: z.string().optional(),
  availability: z.string().optional(),
  location: z.string().optional(),
  zipCode: z.string().optional(),
  availableTime: z.string().optional()
})

const updateUnitSchema = z.object({
  unitNumber: z.string().optional(),
  name: z.string().optional(),
  dimensions: z.string().optional(),
  payload: z.string().optional(),
  notes: z.string().optional(),
  availability: z.string().optional(),
  location: z.string().optional(),
  zipCode: z.string().optional(),
  availableTime: z.string().optional()
})

// Get all units with pagination and search - filtered by account ownership (via vehicle.createdById)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = req.query.search as string || ''
    const availability = req.query.availability as string || ''

    const skip = (page - 1) * limit

    const where: any = {
      isActive: true,
      vehicle: { createdById: req.user!.id }
    }

    if (search) {
      where.OR = [
        { unitNumber: { contains: search, mode: 'insensitive' } },
        { 
          vehicle: {
            driver: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    }

    if (availability) {
      where.availability = availability
    }

    const [units, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        include: {
          vehicle: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { unitNumber: 'asc' }
      }),
      prisma.unit.count({ where })
    ])

    const pages = Math.ceil(total / limit)

    res.json({
      success: true,
      data: units,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    })
  } catch (error) {
    console.error('Get units error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get unit by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      })
    }

    // Ownership check - units via vehicle.createdById
    if (unit.vehicle.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    res.json({
      success: true,
      data: unit
    })
    return
  } catch (error) {
    console.error('Get unit error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unit',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  }
})

// Create new unit
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = createUnitSchema.parse(req.body)

    // Check if vehicle exists and belongs to this account
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId }
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    // Ownership check - vehicle must belong to this account
    if (vehicle.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    // Check if unit already exists for this vehicle
    const existingUnit = await prisma.unit.findUnique({
      where: { vehicleId: data.vehicleId }
    })

    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: 'Unit already exists for this vehicle'
      })
    }

    const unit = await prisma.unit.create({
      data,
      include: {
        vehicle: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      data: unit,
      message: 'Unit created successfully'
    })
    return
  } catch (error) {
    console.error('Create unit error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create unit',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  }
})

// Update unit
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const data = updateUnitSchema.parse(req.body)

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { vehicle: { select: { createdById: true } } }
    })

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      })
    }

    // Ownership check - units via vehicle.createdById
    if (unit.vehicle.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const updatedUnit = await prisma.unit.update({
      where: { id },
      data,
      include: {
        vehicle: {
          include: {
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    res.json({
      success: true,
      data: updatedUnit,
      message: 'Unit updated successfully'
    })
    return
  } catch (error) {
    console.error('Update unit error:', error)
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update unit',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  }
})

// Delete unit
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const unit = await prisma.unit.findUnique({
      where: { id },
      include: { vehicle: { select: { createdById: true } } }
    })

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      })
    }

    // Ownership check - units via vehicle.createdById
    if (unit.vehicle.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    await prisma.unit.update({
      where: { id },
      data: { isActive: false }
    })

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    })
    return
  } catch (error) {
    console.error('Delete unit error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete unit',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return
  }
})

export default router
