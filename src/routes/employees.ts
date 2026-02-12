import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'
import { canSeeAllData } from '../utils/dataAccess'
import { z } from 'zod'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createEmployeeSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  department: z.string().optional(),
  hireDate: z.string().transform((str) => new Date(str)),
  salary: z.number().positive().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE']).optional()
})

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ employeeId: true })

// Get all employees with pagination, search, and filtering
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const search = req.query.search as string
    const status = req.query.status as string
    const department = req.query.department as string

    const skip = (page - 1) * limit

    // Build where clause - ownership: users see only their employees
    const where: any = {}
    if (!canSeeAllData(req.user!.role)) {
      where.createdById = req.user!.id
    }
    
    if (search) {
      const searchOr = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { employeeId: { contains: search, mode: 'insensitive' as const } },
          { position: { contains: search, mode: 'insensitive' as const } }
        ]
      }
      where.AND = Object.keys(where).length > 0 ? [where, searchOr] : [searchOr]
      if (where.createdById) delete where.createdById
    }

    if (status) {
      where.status = status
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' as const }
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.employee.count({ where })
    ])

    return res.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get employees error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get employee by ID
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      })
    }

    if (!canSeeAllData(req.user!.role) && employee.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    return res.json({
      success: true,
      data: employee
    })
  } catch (error) {
    console.error('Get employee error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Create new employee
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedData = createEmployeeSchema.parse(req.body)

    // Check if employee ID already exists for this user
    const existingEmployeeId = await prisma.employee.findUnique({
      where: { employeeId_createdById: { employeeId: validatedData.employeeId, createdById: req.user!.id } }
    })

    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists'
      })
    }

    // Check if email already exists for this user
    const existingEmail = await prisma.employee.findUnique({
      where: { email_createdById: { email: validatedData.email, createdById: req.user!.id } }
    })

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      })
    }

    const employee = await prisma.employee.create({
      data: { ...validatedData, createdById: req.user!.id } as any
    })

    return res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Create employee error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Update employee
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const validatedData = updateEmployeeSchema.parse(req.body)

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      })
    }

    if (!canSeeAllData(req.user!.role) && existingEmployee.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    // Check if email is being updated and already exists (for this user)
    if (validatedData.email && validatedData.email !== existingEmployee.email) {
      const emailExists = await prisma.employee.findUnique({
        where: { email_createdById: { email: validatedData.email, createdById: req.user!.id } }
      })

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        })
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: validatedData
    })

    return res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Update employee error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Update employee status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, message: 'Employee not found' })
    if (!canSeeAllData(req.user!.role) && existing.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: { status }
    })

    return res.json({
      success: true,
      data: employee,
      message: 'Employee status updated successfully'
    })
  } catch (error) {
    console.error('Update employee status error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Delete employee
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const employee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      })
    }

    if (!canSeeAllData(req.user!.role) && employee.createdById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    await prisma.employee.delete({
      where: { id }
    })

    return res.json({
      success: true,
      message: 'Employee deleted successfully'
    })
  } catch (error) {
    console.error('Delete employee error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router
