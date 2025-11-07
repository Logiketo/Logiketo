import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import path from 'path'
import fs from 'fs'
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
    // Use raw SQL to avoid enum type issues
    const allOrdersRaw = await prisma.$queryRawUnsafe(`
      SELECT "orderNumber" 
      FROM orders 
      ORDER BY "orderNumber" DESC
    `) as Array<{ orderNumber: string }>
    
    const allOrders = allOrdersRaw.map((row) => ({ orderNumber: row.orderNumber }))
    
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
  console.log('=== ORDERS ENDPOINT HIT ===')
  console.log('Request query:', req.query)
  console.log('Request headers:', req.headers)
  
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

    console.log('Parsed params:', { pageNum, limitNum, skip })

    // Use raw SQL query to bypass Prisma enum type issues completely
    // ALL filtering is done in raw SQL to avoid Prisma enum comparison errors
    console.log('=== GET ORDERS - Using Raw SQL Query ===')
    
    let orders: any[] = []
    let total = 0
    
    try {
      console.log('Attempting raw SQL query with params:', { limitNum, skip })
      
      // Build WHERE clause for raw SQL
      let whereConditions: string[] = []
      
      // Search filter (multiple fields)
      if (search) {
        const searchStr = String(search)
        whereConditions.push(`(
          LOWER(o."orderNumber") LIKE LOWER('%${searchStr.replace(/'/g, "''")}%') OR
          LOWER(o."pickupAddress") LIKE LOWER('%${searchStr.replace(/'/g, "''")}%') OR
          LOWER(o."deliveryAddress") LIKE LOWER('%${searchStr.replace(/'/g, "''")}%') OR
          LOWER(o.description) LIKE LOWER('%${searchStr.replace(/'/g, "''")}%') OR
          LOWER(c.name) LIKE LOWER('%${searchStr.replace(/'/g, "''")}%')
        )`)
      }
      
      if (orderNumber) {
        const orderNumberStr = String(orderNumber)
        whereConditions.push(`LOWER(o."orderNumber") LIKE LOWER('%${orderNumberStr.replace(/'/g, "''")}%')`)
      }
      
      if (customerLoad) {
        const customerLoadStr = String(customerLoad)
        whereConditions.push(`(LOWER(c.name) LIKE LOWER('%${customerLoadStr.replace(/'/g, "''")}%') OR LOWER(o."customerLoadNumber") LIKE LOWER('%${customerLoadStr.replace(/'/g, "''")}%'))`)
      }
      
      if (unitDriver) {
        const unitDriverStr = String(unitDriver)
        whereConditions.push(`(
          LOWER(v."unitNumber") LIKE LOWER('%${unitDriverStr.replace(/'/g, "''")}%') OR
          LOWER(v."driverName") LIKE LOWER('%${unitDriverStr.replace(/'/g, "''")}%') OR
          LOWER(u."firstName") LIKE LOWER('%${unitDriverStr.replace(/'/g, "''")}%') OR
          LOWER(u."lastName") LIKE LOWER('%${unitDriverStr.replace(/'/g, "''")}%')
        )`)
      }
      
      if (status) {
        // Handle status filtering in raw SQL
        const statusStr = String(status)
        const statusArray = statusStr.split(',').map((s: string) => s.trim().replace(/'/g, "''"))
        const statusConditions = statusArray.map((s: string) => `CAST(o.status AS TEXT) = '${s}'`).join(' OR ')
        whereConditions.push(`(${statusConditions})`)
      }
      
      if (priority) {
        const priorityStr = String(priority)
        const priorityArray = priorityStr.split(',').map((p: string) => p.trim().replace(/'/g, "''"))
        const priorityConditions = priorityArray.map((p: string) => `CAST(o.priority AS TEXT) = '${p}'`).join(' OR ')
        whereConditions.push(`(${priorityConditions})`)
      }
      
      if (customerId) {
        whereConditions.push(`o."customerId" = '${String(customerId).replace(/'/g, "''")}'`)
      }
      
      if (vehicleId) {
        whereConditions.push(`o."vehicleId" = '${String(vehicleId).replace(/'/g, "''")}'`)
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
      
      console.log('Raw SQL WHERE clause:', whereClause)
      
      // Use raw query with safe integer interpolation (limitNum and skip are validated integers)
      // Build the SQL query with explicit column selection
      const sqlQuery = `
        SELECT 
          o.id,
          o."orderNumber",
          o."customerId",
          o."vehicleId",
          o."driverId",
          o."customerLoadNumber",
          o."pickupAddress",
          o."deliveryAddress",
          o."pickupDate",
          o."deliveryDate",
          COALESCE(CAST(o.status AS TEXT), 'PENDING') as status,
          COALESCE(CAST(o.priority AS TEXT), 'NORMAL') as priority,
          o.description,
          o.miles,
          o.pieces,
          o.weight,
          o."loadPay",
          o."driverPay",
          o.notes,
          o.document,
          o.documents,
          o."createdAt",
          o."updatedAt",
          c.id as customer_id,
          c.name as customer_name, 
          c.email as customer_email,
          v.id as vehicle_id,
          v.make as vehicle_make,
          v.model as vehicle_model,
          v."licensePlate" as vehicle_licensePlate,
          COALESCE(v."unitNumber", '') as vehicle_unitNumber,
          COALESCE(v."driverName", '') as vehicle_driverName,
          u.id as driver_id,
          u."firstName" as driver_firstName,
          u."lastName" as driver_lastName,
          u.email as driver_email
        FROM orders o
        LEFT JOIN customers c ON o."customerId" = c.id
        LEFT JOIN vehicles v ON o."vehicleId" = v.id
        LEFT JOIN users u ON o."driverId" = u.id
        ${whereClause}
        ORDER BY o."createdAt" DESC
        LIMIT ${limitNum} OFFSET ${skip}
      `
      
      console.log('[SQL QUERY] Executing:', sqlQuery.substring(0, 500) + '...')
      
      const rawOrders = await prisma.$queryRawUnsafe(sqlQuery) as any[]
      
      console.log(`Raw query returned ${rawOrders.length} rows`)
      
      // Diagnostic: Log the actual structure of the first row to see what columns are returned
      if (rawOrders.length > 0) {
        console.log(`[DIAGNOSTIC] First row keys:`, Object.keys(rawOrders[0]))
        console.log(`[DIAGNOSTIC] First row vehicle-related fields:`, {
          vehicleId: rawOrders[0].vehicleId,
          vehicle_id: rawOrders[0].vehicle_id,
          vehicle_unitNumber: rawOrders[0].vehicle_unitNumber,
          'vehicle_unitnumber': rawOrders[0].vehicle_unitnumber, // lowercase
          vehicle_driverName: rawOrders[0].vehicle_driverName,
          'vehicle_drivername': rawOrders[0].vehicle_drivername, // lowercase
          vehicle_licensePlate: rawOrders[0].vehicle_licensePlate,
          'vehicle_licenseplate': rawOrders[0].vehicle_licenseplate, // lowercase
          vehicle_make: rawOrders[0].vehicle_make,
          vehicle_model: rawOrders[0].vehicle_model,
          full_row: JSON.stringify(rawOrders[0], null, 2)
        })
      }
      
      // Diagnostic: Check first order's vehicle data directly from database
      if (rawOrders.length > 0 && rawOrders[0].vehicleId) {
        try {
          const testVehicle = await prisma.$queryRawUnsafe(`
            SELECT id, "unitNumber", "driverName", "licensePlate", make, model
            FROM vehicles
            WHERE id = '${rawOrders[0].vehicleId.replace(/'/g, "''")}'
          `) as any[]
          console.log(`[DIAGNOSTIC] Direct vehicle query for order ${rawOrders[0].orderNumber}:`, testVehicle)
        } catch (diagError: any) {
          console.error('[DIAGNOSTIC] Error querying vehicle:', diagError.message)
        }
      }
      
      // Transform raw results to match expected format
      orders = rawOrders.map((row: any) => {
        // Helper to safely convert to string or null
        const safeString = (val: any): string | null => {
          if (val === null || val === undefined) return null
          // Handle empty strings from COALESCE
          if (val === '') return null
          const str = String(val).trim()
          return str === '' ? null : str
        }
        
        // Handle both camelCase and lowercase column names (PostgreSQL might return lowercase)
        const unitNumber = row.vehicle_unitNumber ?? row.vehicle_unitnumber ?? null
        const driverName = row.vehicle_driverName ?? row.vehicle_drivername ?? null
        const licensePlate = row.vehicle_licensePlate ?? row.vehicle_licenseplate ?? null
        
        const vehicleObj = row.vehicle_id ? {
          id: row.vehicle_id,
          make: row.vehicle_make || '',
          model: row.vehicle_model || '',
          licensePlate: safeString(licensePlate),
          unitNumber: safeString(unitNumber),
          driverName: safeString(driverName)
        } : null
        
        // Debug logging for first few orders
        if (rawOrders.indexOf(row) < 3) {
          console.log(`[BACKEND LIST] Order ${row.orderNumber}:`, {
            vehicleId: row.vehicleId,
            vehicle_id: row.vehicle_id,
            raw_unitNumber: row.vehicle_unitNumber,
            raw_unitNumber_type: typeof row.vehicle_unitNumber,
            raw_driverName: row.vehicle_driverName,
            raw_driverName_type: typeof row.vehicle_driverName,
            processed_vehicle: vehicleObj,
            vehicle_unitNumber_final: vehicleObj?.unitNumber,
            vehicle_driverName_final: vehicleObj?.driverName
          })
        }
        
        return {
          id: row.id,
          orderNumber: row.orderNumber,
          customerId: row.customerId,
          vehicleId: row.vehicleId,
          driverId: row.driverId,
          customerLoadNumber: row.customerLoadNumber,
          pickupAddress: row.pickupAddress,
          deliveryAddress: row.deliveryAddress,
          pickupDate: row.pickupDate,
          deliveryDate: row.deliveryDate,
          status: row.status,
          priority: row.priority,
          description: row.description,
          miles: row.miles ? parseFloat(row.miles) : null,
          pieces: row.pieces ? parseInt(row.pieces) : null,
          weight: row.weight ? parseFloat(row.weight) : null,
          loadPay: row.loadPay ? parseFloat(row.loadPay) : null,
          driverPay: row.driverPay ? parseFloat(row.driverPay) : null,
          notes: row.notes,
          document: row.document,
          documents: row.documents,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          customer: row.customer_id ? {
            id: row.customer_id,
            name: row.customer_name,
            email: row.customer_email
          } : null,
          vehicle: vehicleObj,
          driver: row.driver_id ? {
            id: row.driver_id,
            firstName: row.driver_firstName,
            lastName: row.driver_lastName,
            email: row.driver_email
          } : null
        }
      })
      
      // Log final orders structure
      if (orders.length > 0) {
        console.log(`[BACKEND LIST] First order final structure:`, JSON.stringify(orders[0], null, 2))
      }
      
      // Get total count using raw SQL with same WHERE clause
      try {
        const countResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*)::int as count 
          FROM orders o
          LEFT JOIN customers c ON o."customerId" = c.id
          ${whereClause}
        `) as any[]
        total = countResult[0]?.count || 0
      } catch (countError: any) {
        console.error('Count query failed, using orders length:', countError.message)
        total = orders.length // Fallback to orders length
      }
      
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


    console.log(`Returning ${orders.length} orders, total: ${total}`)
    
    const response = {
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }
    
    console.log('Response data preview:', {
      success: response.success,
      dataLength: response.data.length,
      pagination: response.pagination
    })
    
    res.json(response)
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
            capacity: true,
            unitNumber: true,
            driverName: true
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

    // Debug logging for single order
    console.log(`[BACKEND SINGLE] Order ${order.orderNumber}:`, {
      vehicleId: order.vehicleId,
      vehicle: order.vehicle,
      vehicle_unitNumber: order.vehicle?.unitNumber,
      vehicle_driverName: order.vehicle?.driverName,
      full_order: JSON.stringify(order, null, 2)
    })

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
        const filePath = path.join(process.env.UPLOAD_PATH || './uploads', docFile.filename)
        const fileExists = fs.existsSync(filePath)
        console.log(`[ORDER UPLOAD] Document ${i}: ${docName}`)
        console.log(`[ORDER UPLOAD] Filename: ${docFile.filename}`)
        console.log(`[ORDER UPLOAD] File path: ${filePath}`)
        console.log(`[ORDER UPLOAD] File exists: ${fileExists}`)
        console.log(`[ORDER UPLOAD] File size: ${docFile.size} bytes`)
        
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

    // Update order status - IN_TRANSIT requires special handling (enum missing in DB)
    let order
    if (status === 'IN_TRANSIT') {
      // Add IN_TRANSIT to enum if missing
      try {
        await prisma.$executeRawUnsafe(`
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_enum 
              WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
              AND enumlabel = 'IN_TRANSIT'
            ) THEN
              ALTER TYPE "OrderStatus" ADD VALUE 'IN_TRANSIT';
            END IF;
          END $$;
        `)
      } catch (e) {}
      
      // Use raw SQL to update (bypasses Prisma enum validation)
      await prisma.$executeRawUnsafe(`
        UPDATE orders 
        SET status = 'IN_TRANSIT'::"OrderStatus", "updatedAt" = NOW()
        WHERE id = '${id.replace(/'/g, "''")}'
      `)
      
      // Fetch updated order
      order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
          driver: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      })
    } else {
      // Use Prisma for other statuses (works fine)
      order = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          vehicle: { select: { id: true, make: true, model: true, licensePlate: true } },
          driver: { select: { id: true, firstName: true, lastName: true, email: true } }
        }
      })
    }

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
