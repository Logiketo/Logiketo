import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'

import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import customerRoutes from './routes/customers'
import vehicleRoutes from './routes/vehicles'
import orderRoutes from './routes/orders'
import employeeRoutes from './routes/employees'
import trackingRoutes from './routes/tracking'
import dispatchRoutes from './routes/dispatch'
import unitRoutes from './routes/units'
import reportRoutes from './routes/reports'

// Load environment variables
dotenv.config()

// Initialize Prisma client
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Initialize database on startup
async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Check if users table exists, if not create it
    try {
      await prisma.user.findFirst()
      console.log('✅ Database tables exist')
    } catch (error) {
      console.log('⚠️ Database tables missing, creating them...')
      
      // Create users table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'USER',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `
      console.log('✅ Users table created')
      
      // Create customers table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "customers" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT,
          "phone" TEXT,
          "address" TEXT,
          "city" TEXT,
          "state" TEXT,
          "zipCode" TEXT,
          "country" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "createdById" TEXT NOT NULL
        );
      `
      console.log('✅ Customers table created')
      
      // Create vehicles table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "vehicles" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "make" TEXT NOT NULL,
          "model" TEXT NOT NULL,
          "year" INTEGER NOT NULL,
          "licensePlate" TEXT NOT NULL UNIQUE,
          "vin" TEXT UNIQUE,
          "color" TEXT,
          "capacity" DOUBLE PRECISION,
          "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          "driverId" TEXT,
          "unitNumber" TEXT,
          "driverName" TEXT,
          "dimensions" TEXT,
          "payload" TEXT,
          "registrationExpDate" TEXT,
          "insuranceExpDate" TEXT,
          "insuranceDocument" TEXT,
          "registrationDocument" TEXT,
          "documents" JSONB
        );
      `
      console.log('✅ Vehicles table created')
      
      // Create orders table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "orders" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderNumber" TEXT NOT NULL UNIQUE,
          "customerId" TEXT NOT NULL,
          "vehicleId" TEXT,
          "driverId" TEXT,
          "employeeId" TEXT,
          "customerLoadNumber" TEXT,
          "pickupAddress" TEXT NOT NULL,
          "deliveryAddress" TEXT NOT NULL,
          "pickupDate" TIMESTAMP(3) NOT NULL,
          "deliveryDate" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "priority" TEXT NOT NULL DEFAULT 'NORMAL',
          "description" TEXT,
          "miles" DOUBLE PRECISION,
          "pieces" INTEGER,
          "weight" DOUBLE PRECISION,
          "loadPay" DOUBLE PRECISION,
          "driverPay" DOUBLE PRECISION,
          "notes" TEXT,
          "document" TEXT,
          "documents" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `
      console.log('✅ Orders table created')
      
      // Create employees table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "employees" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "employeeId" TEXT NOT NULL UNIQUE,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "email" TEXT NOT NULL UNIQUE,
          "phone" TEXT,
          "position" TEXT NOT NULL,
          "department" TEXT,
          "hireDate" TIMESTAMP(3) NOT NULL,
          "salary" DOUBLE PRECISION,
          "status" TEXT NOT NULL DEFAULT 'ACTIVE',
          "address" TEXT,
          "emergencyContact" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `
      console.log('✅ Employees table created')
      
      // Create units table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "units" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "vehicleId" TEXT NOT NULL UNIQUE,
          "unitNumber" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "dimensions" TEXT,
          "payload" TEXT,
          "notes" TEXT,
          "availability" TEXT,
          "location" TEXT,
          "zipCode" TEXT,
          "availableTime" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `
      console.log('✅ Units table created')
      
      // Create tracking_events table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "tracking_events" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "status" TEXT NOT NULL,
          "location" TEXT,
          "latitude" DOUBLE PRECISION,
          "longitude" DOUBLE PRECISION,
          "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "notes" TEXT
        );
      `
      console.log('✅ Tracking events table created')
      
      console.log('🎉 All database tables created successfully!')
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    console.log('⚠️ Server will start anyway, but database operations may fail')
  }
}

// Initialize database before starting server
initializeDatabase()

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 3001

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(morgan('combined'))
app.use(limiter)
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploaded files
app.use('/uploads', express.static(process.env.UPLOAD_PATH || './uploads'))

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/tracking', trackingRoutes)
app.use('/api/dispatch', dispatchRoutes)
app.use('/api/units', unitRoutes)
app.use('/api/reports', reportRoutes)

// Socket.io for real-time features
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`)
    console.log(`User ${socket.id} joined order ${orderId}`)
  })
  
  socket.on('leave-order', (orderId) => {
    socket.leave(`order-${orderId}`)
    console.log(`User ${socket.id} left order ${orderId}`)
  })
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Logiketo API server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export { io }
