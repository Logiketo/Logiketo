import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

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

// Trust proxy for Railway
app.set('trust proxy', 1)

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

// Serve uploaded files - use dedicated route for better error handling
const uploadDir = process.env.UPLOAD_PATH || './uploads'

// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Dedicated route for serving files with proper error handling
app.get('/uploads/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ success: false, error: 'Invalid filename' })
    }
    
    const filePath = path.join(uploadDir, filename)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      return res.status(404).json({ success: false, error: `Not Found - /uploads/${filename}` })
    }
    
    // Send file with appropriate headers
    res.sendFile(path.resolve(filePath))
  } catch (error: any) {
    console.error('Error serving file:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// Also keep static route as fallback
app.use('/uploads', express.static(uploadDir))

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
