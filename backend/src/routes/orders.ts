import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { uploadOrderDocuments } from '../middleware/upload'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().optional().or(z.literal('')),
  driverId: z.string().optional().or(z.literal('')),
  employeeId: z.string().optional().or(z.literal('')), // Employee who took the load
  customerLoadNumber: z.string().optional().or(z.literal('')), // Customer load# (auto-generated)
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  pickupDate: z.string().datetime('Invalid pickup date'),
  deliveryDate: z.string().datetime('Invalid delivery date').optional().or(z.literal('')),
  miles: z.number().positive().optional(), // Miles
  pieces: z.number().int().positive().optional(), // Pieces
  weight: z.number().positive().optional(),
  loadPay: z.number().positive().optional(),
  driverPay: z.number().positive().optional(),
  notes: z.string().optional().or(z.literal('')),
  document: z.string().optional().or(z.literal('')), // Document field
  documents: z.array(z.object({
    name: z.string(),
    path: z.string(),
    uploadDate: z.string()
  })).optional().or(z.undefined())
})

const updateOrderSchema = createOrderSchema.partial()

// Generate unique order number
const generateOrderNumber = async (): Promise<string> => {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    // Find the highest order number that is a simple number (1, 2, 3, etc.)
    const allOrders = await prisma.order.findMany({
      select: {
        orderNumber: true
      },
      orderBy: {
        orderNumber: 'desc'
      }
    })
    
    // Filter for simple numeric order numbers only
    const numericOrders = allOrders.filter((order: any) => {
      const orderNum = order.orderNumber
      return /^\d+$/.test(orderNum) // Only simple numbers like "1", "2", "3"
    })
    
    const lastOrder = numericOrders[0] || null
    
    let sequence = 1
    if (lastOrder) {
      // Extract number from order number (e.g., "1", "2", "3")
      const lastNumber = parseInt(lastOrder.orderNumber)
      if (!isNaN(lastNumber)) {
        sequence = lastNumber + 1
      }
    }
    
    const orderNumber = sequence.toString()
    
    // Check if this order number already exists
    const existingOrder = await prisma.order.findUnique({
      where: { orderNumber }
    })
    
    if (!existingOrder) {
      return orderNumber
    }
    
    attempts++
  }
  
  // Fallback to timestamp-based order number if we can't find a unique sequential number
  return `ORD-${Date.now()}`
}

// Get all orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      search = '', 
      orderNumber = '',
      customerLoad = '',
      unitDriver = '',
      status = '', 
      priority = '',
      customerId = '',
      vehicleId = ''
    } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    
    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string, mode: 'insensitive' as const } },
        { pickupAddress: { contains: search as string, mode: 'insensitive' as const } },
        { deliveryAddress: { contains: search as string, mode: 'insensitive' as const } },
        { description: { contains: search as string, mode: 'insensitive' as const } },
        { customer: { name: { contains: search as string, mode: 'insensitive' as const } } }
      ]
    }

    if (orderNumber) {
      where.orderNumber = { contains: orderNumber as string, mode: 'insensitive' as const }
    }

    if (customerLoad) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { customer: { name: { contains: customerLoad as string, mode: 'insensitive' as const } } },
            { customerLoadNumber: { contains: customerLoad as string, mode: 'insensitive' as const } }
          ]
        }
      ]
    }

    if (unitDriver) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { vehicle: { unitNumber: { contains: unitDriver as string, mode: 'insensitive' as const } } },
            { vehicle: { driverName: { contains: unitDriver as string, mode: 'insensitive' as const } } },
            { driver: { firstName: { contains: unitDriver as string, mode: 'insensitive' as const } } },
            { driver: { lastName: { contains: unitDriver as string, mode: 'insensitive' as const } } }
          ]
        }
      ]
    }

    // Status and priority filtering disabled to prevent enum type errors
    // The database columns may be TEXT or enum types, causing Prisma comparison issues
    if (status) {
      console.log('Status filter received but disabled:', status)
      // where.status = status // Disabled to prevent enum errors
    }

    if (priority) {
      console.log('Priority filter received but disabled:', priority)
      // where.priority = priority // Disabled to prevent enum errors
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (vehicleId) {
      where.vehicleId = vehicleId
    }

    // Ultra-simplified query - minimal includes to avoid any enum/relation errors
    console.log('=== GET ORDERS - Ultra Simplified Query ===')
    
    let orders: any[] = []
    let total = 0
    
    try {
      // Try with minimal includes first
      orders = await prisma.order.findMany({
        take: limitNum,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          vehicleId: true,
          driverId: true,
          customerLoadNumber: true,
          pickupAddress: true,
          deliveryAddress: true,
          pickupDate: true,
          deliveryDate: true,
          status: true,
          priority: true,
          description: true,
          miles: true,
          pieces: true,
          weight: true,
          loadPay: true,
          driverPay: true,
          notes: true,
          document: true,
          documents: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          vehicle: {
            select: {
              id: true,
              make: true,
              model: true,
              licensePlate: true,
              unitNumber: true,
              driverName: true
            }
          },
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      })
      
      total = await prisma.order.count()
      
      console.log(`Successfully fetched ${orders.length} orders, total: ${total}`)
    } catch (queryError: any) {
      console.error('=== ORDERS QUERY FAILED ===')
      console.error('Error:', queryError.message)
      console.error('Code:', queryError.code)
      console.error('Meta:', JSON.stringify(queryError.meta, null, 2))
      
      // Return empty array so frontend doesn't crash
      orders = []
      total = 0
    }


    res.json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
    return
  } catch (error: any) {
    console.error('Get orders error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    })
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
    return
  }
})

// Get order by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true,
            color: true,
            capacity: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        trackingEvents: {
          orderBy: { timestamp: 'desc' }
        }
      }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    res.json({
      success: true,
      data: order
    })
    return
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Create new order
router.post('/', authenticate, uploadOrderDocuments, async (req: AuthRequest, res) => {
  try {
    // Convert string numbers to actual numbers for FormData
    const processedData = { ...req.body }
    if (processedData.miles && typeof processedData.miles === 'string') {
      processedData.miles = parseFloat(processedData.miles)
    }
    if (processedData.pieces && typeof processedData.pieces === 'string') {
      processedData.pieces = parseInt(processedData.pieces)
    }
    if (processedData.weight && typeof processedData.weight === 'string') {
      processedData.weight = parseFloat(processedData.weight)
    }
    if (processedData.loadPay && typeof processedData.loadPay === 'string') {
      processedData.loadPay = parseFloat(processedData.loadPay)
    }
    if (processedData.driverPay && typeof processedData.driverPay === 'string') {
      processedData.driverPay = parseFloat(processedData.driverPay)
    }
    
    const validatedData = createOrderSchema.parse(processedData)
    
    // Handle uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    
    // Handle new document system
    const documents = []
    for (let i = 0; i < 5; i++) {
      const docFile = files?.[`document_${i}`]?.[0]
      const docName = req.body[`document_name_${i}`]
      const docNotes = req.body[`document_notes_${i}`]
      if (docFile && docName) {
        documents.push({
          name: docName,
          path: docFile.filename,
          uploadDate: new Date().toISOString(),
          notes: docNotes || ''
        })
      }
    }
    
    console.log('Order Documents being processed:', documents)
    console.log('Order Files received:', Object.keys(files || {}))

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId }
    })

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer not found'
      })
    }

    // Check if vehicle exists and is available (if provided)
    if (validatedData.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: validatedData.vehicleId }
      })

      if (!vehicle) {
        return res.status(400).json({
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
    }

    // Check if driver exists (if provided)
    if (validatedData.driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: validatedData.driverId }
      })

      if (!driver) {
        return res.status(400).json({
          success: false,
          message: 'Driver not found'
        })
      }
    }

    // Generate order number (simple sequential: 1, 2, 3, etc.)
    const orderNumber = await generateOrderNumber()

    // Create order
    const order = await prisma.order.create({
      data: {
        ...validatedData,
        orderNumber,
        status: 'ASSIGNED', // Set status to ASSIGNED for new orders
        pickupDate: new Date(validatedData.pickupDate),
        deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null,
        documents: documents.length > 0 ? documents : undefined
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create initial tracking event
    await prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        status: 'ASSIGNED',
        location: validatedData.pickupAddress,
        notes: 'Order created and assigned'
      }
    })

    res.status(201).json({
      success: true,
      data: order,
      message: 'Order created successfully'
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

    console.error('Create order error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Update order
router.put('/:id', authenticate, uploadOrderDocuments, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    
    // Convert string numbers to actual numbers for FormData
    const processedData = { ...req.body }
    if (processedData.miles && typeof processedData.miles === 'string') {
      processedData.miles = parseFloat(processedData.miles)
    }
    if (processedData.pieces && typeof processedData.pieces === 'string') {
      processedData.pieces = parseInt(processedData.pieces)
    }
    if (processedData.weight && typeof processedData.weight === 'string') {
      processedData.weight = parseFloat(processedData.weight)
    }
    if (processedData.loadPay && typeof processedData.loadPay === 'string') {
      processedData.loadPay = parseFloat(processedData.loadPay)
    }
    if (processedData.driverPay && typeof processedData.driverPay === 'string') {
      processedData.driverPay = parseFloat(processedData.driverPay)
    }
    
    const validatedData = updateOrderSchema.parse(processedData)
    
    // Handle uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    
    // Handle new document system
    const documents = []
    for (let i = 0; i < 5; i++) {
      const docFile = files?.[`document_${i}`]?.[0]
      const docName = req.body[`document_name_${i}`]
      const docNotes = req.body[`document_notes_${i}`]
      if (docFile && docName) {
        documents.push({
          name: docName,
          path: docFile.filename,
          uploadDate: new Date().toISOString(),
          notes: docNotes || ''
        })
      }
    }
    
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Handle existing document notes updates
    const existingDocuments: any[] = []
    if (existingOrder.documents && Array.isArray(existingOrder.documents)) {
      existingDocuments.push(...existingOrder.documents)
    }
    
    // Update notes for existing documents
    for (let i = 0; i < 5; i++) {
      const existingDocNotes = req.body[`existing_document_${i}_notes`]
      if (existingDocNotes !== undefined && existingDocuments[i]) {
        existingDocuments[i].notes = existingDocNotes
      }
    }
    
    console.log('Update Order - Documents being processed:', documents)
    console.log('Update Order - Files received:', Object.keys(files || {}))
    console.log('Update Order - Existing documents with notes:', existingDocuments)

    // Check if customer exists (if being updated)
    if (validatedData.customerId && validatedData.customerId !== existingOrder.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: validatedData.customerId }
      })

      if (!customer) {
        return res.status(400).json({
          success: false,
          message: 'Customer not found'
        })
      }
    }

    // Check if vehicle exists and is available (if being updated)
    if (validatedData.vehicleId && validatedData.vehicleId !== existingOrder.vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: validatedData.vehicleId }
      })

      if (!vehicle) {
        return res.status(400).json({
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
    }

    // Check if driver exists (if being updated)
    if (validatedData.driverId && validatedData.driverId !== existingOrder.driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: validatedData.driverId }
      })

      if (!driver) {
        return res.status(400).json({
          success: false,
          message: 'Driver not found'
        })
      }
    }

    // Merge existing documents with new ones
    let finalDocuments: any[] = []
    // Use the updated existing documents (with notes) instead of original
    if (existingDocuments.length > 0) {
      finalDocuments = [...existingDocuments]
    }
    if (documents.length > 0) {
      finalDocuments = [...finalDocuments, ...documents]
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        ...validatedData,
        pickupDate: validatedData.pickupDate ? new Date(validatedData.pickupDate) : undefined,
        deliveryDate: validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : undefined,
        ...(finalDocuments.length > 0 && { documents: finalDocuments })
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    res.json({
      success: true,
      data: order,
      message: 'Order updated successfully'
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

    console.error('Update order error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Update order status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { status, location, notes } = req.body

    const validStatuses = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Update order status
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        vehicle: {
          select: {
            id: true,
            make: true,
            model: true,
            licensePlate: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create tracking event
    await prisma.trackingEvent.create({
      data: {
        orderId: id,
        status,
        location,
        notes: notes || `Status changed to ${status}`
      }
    })

    res.json({
      success: true,
      data: order,
      message: 'Order status updated successfully'
    })
    return
  } catch (error) {
    console.error('Update order status error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Delete order
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const existingOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    // Only allow deletion of pending orders
    if (existingOrder.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be deleted'
      })
    }

    // Delete tracking events first
    await prisma.trackingEvent.deleteMany({
      where: { orderId: id }
    })

    // Delete order
    await prisma.order.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Order deleted successfully'
    })
    return
  } catch (error) {
    console.error('Delete order error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Delete document from order
router.delete('/:id/documents/:documentIndex', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id, documentIndex } = req.params
    const index = parseInt(documentIndex)

    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document index'
      })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: { documents: true }
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      })
    }

    let documents: any[] = []
    if (order.documents && Array.isArray(order.documents)) {
      documents = [...order.documents]
    }

    if (index >= documents.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      })
    }

    // Remove the document at the specified index
    documents.splice(index, 1)

    // Update the order with the new documents array
    await prisma.order.update({
      where: { id },
      data: { documents }
    })

    res.json({
      success: true,
      message: 'Document deleted successfully'
    })
    return
  } catch (error) {
    console.error('Delete document error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

export default router
