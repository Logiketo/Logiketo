import express from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { emailService } from '../services/emailService'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'DISPATCHER', 'DRIVER', 'USER']).optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

// Register new user
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds)

    // Create user (not approved by default) using raw SQL
    const user = await prisma.$queryRaw`
      INSERT INTO users (id, email, password, "firstName", "lastName", role, "isActive", "isApproved", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${validatedData.email}, ${hashedPassword}, ${validatedData.firstName}, ${validatedData.lastName}, ${validatedData.role || 'USER'}::"UserRole", true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, "firstName", "lastName", role, "isActive", "isApproved", "createdAt"
    `
    
    const newUser = (user as any)[0]

    // Send email notification to admin about new user registration
    console.log(`🔔 New user registration: ${newUser.firstName} ${newUser.lastName} (${newUser.email}) - Pending Approval`)
    
    // Get admin email (you can configure this in environment variables)
    const adminEmail = process.env.ADMIN_EMAIL || 'sales@logiketo.com'
    
    // Send notification email to admin
    await emailService.sendNewUserNotification(adminEmail, {
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role
    })

    res.status(201).json({
      success: true,
      data: {
        user: {
          ...newUser,
          isApproved: false  // Always return false for new registrations
        }
      },
      message: 'Registration successful! Your account is pending admin approval. You will receive an email when approved.'
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

    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body)

    // Find user using raw SQL
    const userResult = await prisma.$queryRaw`
      SELECT id, email, password, "firstName", "lastName", role, "isActive", "isApproved", "createdAt", "updatedAt"
      FROM users
      WHERE email = ${validatedData.email}
    `
    
    const user = (userResult as any)[0]

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Check if user is approved
    if (!user.isApproved) {
      return res.status(401).json({
        success: false,
        message: 'Account is pending admin approval. Please wait for approval before logging in.'
      })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    )

    // Return user data (without password)
    const { password, ...userWithoutPassword } = user

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
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

    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Change password
router.put('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password in database
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedNewPassword }
    })

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
    return
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })
    return
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
    return
  }
})

// Logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  })
})

// Admin routes for user approval
// Get all users (admin only)
router.get('/all-users', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      })
    }

    const allUsers = await prisma.$queryRaw`
      SELECT id, email, "firstName", "lastName", role, "isActive", "isApproved", "createdAt"
      FROM users
      ORDER BY "createdAt" DESC
    `

    return res.json({
      success: true,
      data: allUsers
    })
  } catch (error) {
    console.error('Get all users error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Get pending users (admin only)
router.get('/pending-users', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      })
    }

    const pendingUsers = await prisma.$queryRaw`
      SELECT id, email, "firstName", "lastName", role, "createdAt"
      FROM users
      WHERE "isApproved" = false AND "isActive" = true
      ORDER BY "createdAt" DESC
    `

    return res.json({
      success: true,
      data: pendingUsers
    })
  } catch (error) {
    console.error('Get pending users error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Approve user (admin only)
router.put('/approve-user/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      })
    }

    const { userId } = req.params

    const user = await prisma.$queryRaw`
      UPDATE users 
      SET "isApproved" = true, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ${userId}
      RETURNING id, email, "firstName", "lastName", role, "isApproved"
    `
    
    const updatedUser = (user as any)[0]

    // Send approval email to user
    console.log(`✅ User approved: ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.email})`)
    
    await emailService.sendApprovalNotification(updatedUser.email, {
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName
    })

    return res.json({
      success: true,
      data: updatedUser,
      message: 'User approved successfully'
    })
  } catch (error) {
    console.error('Approve user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// Reject user (admin only)
router.delete('/reject-user/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      })
    }

    const { userId } = req.params

    // Get user info before deletion
    const userResult = await prisma.$queryRaw`
      SELECT "firstName", "lastName", email
      FROM users
      WHERE id = ${userId}
    `
    
    const user = (userResult as any)[0]

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Delete the user
    await prisma.$executeRaw`
      DELETE FROM users WHERE id = ${userId}
    `

    // Send rejection email to user
    console.log(`❌ User rejected: ${user.firstName} ${user.lastName} (${user.email})`)
    
    await emailService.sendRejectionNotification(user.email, {
      firstName: user.firstName,
      lastName: user.lastName
    })

    return res.json({
      success: true,
      message: 'User rejected and deleted successfully'
    })
  } catch (error) {
    console.error('Reject user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

export default router