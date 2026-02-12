import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal(''))
})

const updateCustomerSchema = createCustomerSchema.partial()

// Get all customers
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where = search ? {
      OR: [
        { name: { contains: search as string, mode: 'insensitive' as const } },
        { email: { contains: search as string, mode: 'insensitive' as const } },
        { phone: { contains: search as string, mode: 'insensitive' as const } }
      ]
    } : {}

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              orders: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.customer.count({ where })
    ])

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
    return
  } catch (error) {
    console.error('Get customers error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Get customer by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        orders: {
          include: {
            vehicle: true,
            driver: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    res.json({
      success: true,
      data: customer
    })
    return
  } catch (error) {
    console.error('Get customer error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Create new customer
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedData = createCustomerSchema.parse(req.body)

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        createdById: req.user!.id
      } as any,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Create customer error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Update customer
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const validatedData = updateCustomerSchema.parse(req.body)

    const existingCustomer = await prisma.customer.findUnique({
      where: { id }
    })

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: validatedData,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    })
    return
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }

    console.error('Update customer error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Delete customer
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      })
    }

    if (existingCustomer._count.orders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer with existing orders'
      })
    }

    await prisma.customer.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    })
    return
  } catch (error) {
    console.error('Delete customer error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

export default router
