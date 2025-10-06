import express from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { uploadVehicleDocuments } from '../middleware/upload'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const createVehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1),
  licensePlate: z.string().min(1, 'License plate is required'),
  vin: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  capacity: z.coerce.number().positive().optional().or(z.undefined()),
  driverId: z.string().optional().or(z.literal('')).or(z.undefined()),
  // New fields that exist in the database
  unitNumber: z.string().optional().or(z.literal('')).or(z.undefined()),
  driverName: z.string().optional().or(z.literal('')).or(z.undefined()),
  dimensions: z.string().optional().or(z.literal('')).or(z.undefined()),
  payload: z.string().optional().or(z.literal('')).or(z.undefined()),
  registrationExpDate: z.string().optional().or(z.literal('')).or(z.undefined()),
  insuranceExpDate: z.string().optional().or(z.literal('')).or(z.undefined()),
  insuranceDocument: z.string().optional().or(z.literal('')).or(z.undefined()),
  registrationDocument: z.string().optional().or(z.literal('')).or(z.undefined()),
  documents: z.array(z.object({
    name: z.string(),
    path: z.string(),
    uploadDate: z.string()
  })).optional().or(z.undefined())
})

const updateVehicleSchema = createVehicleSchema.partial()

// Get all vehicles
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '10', search = '', status = '' } = req.query
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    
    if (search) {
      where.OR = [
        { make: { contains: search as string, mode: 'insensitive' as const } },
        { model: { contains: search as string, mode: 'insensitive' as const } },
        { licensePlate: { contains: search as string, mode: 'insensitive' as const } },
        { vin: { contains: search as string, mode: 'insensitive' as const } },
        { unitNumber: { contains: search as string, mode: 'insensitive' as const } },
        { driverName: { contains: search as string, mode: 'insensitive' as const } },
        { 
          driver: {
            OR: [
              { firstName: { contains: search as string, mode: 'insensitive' as const } },
              { lastName: { contains: search as string, mode: 'insensitive' as const } }
            ]
          }
        }
      ]
    }

    if (status) {
      where.status = status
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        select: {
          id: true,
          unitNumber: true,
          make: true,
          model: true,
          year: true,
          licensePlate: true,
          vin: true,
          color: true,
          capacity: true,
          status: true,
          driverName: true,
          dimensions: true,
          payload: true,
          registrationExpDate: true,
          insuranceExpDate: true,
          insuranceDocument: true,
          registrationDocument: true,
          documents: true,
          createdAt: true,
          updatedAt: true,
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
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
      prisma.vehicle.count({ where })
    ])


    // Debug: Log the first vehicle's documents field
    if (vehicles.length > 0) {
      console.log('First vehicle documents:', vehicles[0].documents)
    }

    res.json({
      success: true,
      data: vehicles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    })
    return
  } catch (error) {
    console.error('Get vehicles error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Get vehicle by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: {
        id: true,
        unitNumber: true,
        make: true,
        model: true,
        year: true,
        licensePlate: true,
        vin: true,
        color: true,
        capacity: true,
        status: true,
        driverName: true,
        dimensions: true,
        payload: true,
        registrationExpDate: true,
        insuranceExpDate: true,
        insuranceDocument: true,
        registrationDocument: true,
        documents: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        orders: {
          include: {
            customer: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    // Debug: Log the vehicle's documents field
    console.log('Vehicle documents:', vehicle.documents)

    res.json({
      success: true,
      data: vehicle
    })
    return
  } catch (error) {
    console.error('Get vehicle error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Create new vehicle
router.post('/', authenticate, uploadVehicleDocuments, async (req: AuthRequest, res) => {
  try {
    const validatedData = createVehicleSchema.parse(req.body)
    
    // Handle uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const insuranceDocument = files?.insuranceDocument?.[0]?.filename
    const registrationDocument = files?.registrationDocument?.[0]?.filename
    
    // Handle new document system
    const documents = []
    for (let i = 0; i < 5; i++) {
      const docFile = files?.[`document_${i}`]?.[0]
      const docName = req.body[`document_name_${i}`]
      if (docFile && docName) {
        documents.push({
          name: docName,
          path: docFile.filename,
          uploadDate: new Date().toISOString()
        })
      }
    }
    
    console.log('Documents being processed:', documents)
    console.log('Files received:', Object.keys(files || {}))
    
    // Add file paths to validated data
    const vehicleData = {
      ...validatedData,
      insuranceDocument,
      registrationDocument,
      documents: documents.length > 0 ? documents : undefined
    }

    // Check if license plate already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { licensePlate: validatedData.licensePlate }
    })

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle with this license plate already exists'
      })
    }

    // Check if VIN already exists (if provided)
    if (validatedData.vin) {
      const existingVin = await prisma.vehicle.findUnique({
        where: { vin: validatedData.vin }
      })

      if (existingVin) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this VIN already exists'
        })
      }
    }

    // Check if driver exists and is available (if provided)
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

      // Check if driver is already assigned to another vehicle
      const existingDriverVehicle = await prisma.vehicle.findFirst({
        where: { 
          driverId: validatedData.driverId,
          status: { not: 'OUT_OF_SERVICE' }
        }
      })

      if (existingDriverVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Driver is already assigned to another vehicle'
        })
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: vehicleData,
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
    })

    // Automatically create a unit for the vehicle
    const unitData = {
      vehicleId: vehicle.id,
      unitNumber: vehicleData.unitNumber || vehicle.licensePlate,
      name: vehicleData.driverName || vehicleData.unitNumber || `Unit ${vehicle.licensePlate}`,
      dimensions: vehicleData.dimensions,
      payload: vehicleData.payload
    }

    await prisma.unit.create({
      data: unitData
    })

    res.status(201).json({
      success: true,
      data: vehicle,
      message: 'Vehicle created successfully'
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

    console.error('Create vehicle error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Update vehicle
router.put('/:id', authenticate, uploadVehicleDocuments, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    console.log('Update request body:', req.body)
    const validatedData = updateVehicleSchema.parse(req.body)
    console.log('Validated data:', validatedData)
    
    // Handle uploaded files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] }
    const insuranceDocument = files?.insuranceDocument?.[0]?.filename
    const registrationDocument = files?.registrationDocument?.[0]?.filename
    
    // Handle new document system
    const documents = []
    for (let i = 0; i < 5; i++) {
      const docFile = files?.[`document_${i}`]?.[0]
      const docName = req.body[`document_name_${i}`]
      if (docFile && docName) {
        documents.push({
          name: docName,
          path: docFile.filename,
          uploadDate: new Date().toISOString()
        })
      }
    }
    
    console.log('Update - Documents being processed:', documents)
    console.log('Update - Files received:', Object.keys(files || {}))
    
    // Get existing vehicle data from the database
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id }
    })

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    // Merge existing documents with new ones
    let finalDocuments: any[] = []
    if (existingVehicle.documents && Array.isArray(existingVehicle.documents)) {
      finalDocuments = [...existingVehicle.documents]
    }
    if (documents.length > 0) {
      finalDocuments = [...finalDocuments, ...documents]
    }

    // Add file paths to validated data if files were uploaded, otherwise preserve existing
    const updateData = {
      ...validatedData,
      ...(insuranceDocument && { insuranceDocument }),
      ...(registrationDocument && { registrationDocument }),
      ...(finalDocuments.length > 0 && { documents: finalDocuments })
    }

    // Check if license plate already exists (if being updated)
    if (validatedData.licensePlate && validatedData.licensePlate !== existingVehicle.licensePlate) {
      const existingLicensePlate = await prisma.vehicle.findUnique({
        where: { licensePlate: validatedData.licensePlate }
      })

      if (existingLicensePlate) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this license plate already exists'
        })
      }
    }

    // Check if VIN already exists (if being updated)
    if (validatedData.vin && validatedData.vin !== existingVehicle.vin) {
      const existingVin = await prisma.vehicle.findUnique({
        where: { vin: validatedData.vin }
      })

      if (existingVin) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle with this VIN already exists'
        })
      }
    }

    // Check if driver exists and is available (if being updated)
    if (validatedData.driverId && validatedData.driverId !== existingVehicle.driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: validatedData.driverId }
      })

      if (!driver) {
        return res.status(400).json({
          success: false,
          message: 'Driver not found'
        })
      }

      // Check if driver is already assigned to another vehicle
      const existingDriverVehicle = await prisma.vehicle.findFirst({
        where: { 
          driverId: validatedData.driverId,
          status: { not: 'OUT_OF_SERVICE' },
          id: { not: id }
        }
      })

      if (existingDriverVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Driver is already assigned to another vehicle'
        })
      }
    }

    console.log('Final updateData being sent to database:', updateData)
    
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: updateData,
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
    })

    // Update the associated unit if it exists
    const existingUnit = await prisma.unit.findUnique({
      where: { vehicleId: id }
    })

    if (existingUnit) {
      const unitUpdateData: any = {}
      
      if (validatedData.unitNumber !== undefined) {
        unitUpdateData.unitNumber = validatedData.unitNumber
      }
      
      // Priority: driverName > unitNumber > existing unit name
      if (validatedData.driverName !== undefined && validatedData.driverName.trim() !== '') {
        unitUpdateData.name = validatedData.driverName
      } else if (validatedData.unitNumber !== undefined) {
        unitUpdateData.name = validatedData.unitNumber
      }
      
      if (validatedData.dimensions !== undefined) {
        unitUpdateData.dimensions = validatedData.dimensions
      }
      if (validatedData.payload !== undefined) {
        unitUpdateData.payload = validatedData.payload
      }

      if (Object.keys(unitUpdateData).length > 0) {
        await prisma.unit.update({
          where: { vehicleId: id },
          data: unitUpdateData
        })
        console.log(`Updated unit name to: ${unitUpdateData.name}`)
      }
    }

    res.json({
      success: true,
      data: vehicle,
      message: 'Vehicle updated successfully'
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

    console.error('Update vehicle error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Update vehicle status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      })
    }

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id }
    })

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: { status },
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
    })

    res.json({
      success: true,
      data: vehicle,
      message: 'Vehicle status updated successfully'
    })
    return
  } catch (error) {
    console.error('Update vehicle status error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Delete vehicle
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true
          }
        }
      }
    })

    if (!existingVehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    if (existingVehicle._count.orders > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle with existing orders'
      })
    }

    await prisma.vehicle.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    })
    return
  } catch (error) {
    console.error('Delete vehicle error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Delete document from vehicle
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

    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { documents: true }
    })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    let documents: any[] = []
    if (vehicle.documents && Array.isArray(vehicle.documents)) {
      documents = [...vehicle.documents]
    }

    if (index >= documents.length) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      })
    }

    // Remove the document at the specified index
    documents.splice(index, 1)

    // Update the vehicle with the new documents array
    await prisma.vehicle.update({
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
