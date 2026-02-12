import express from 'express'
import bcrypt from 'bcryptjs'
import jwt, { SignOptions } from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authenticate, authorize, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Admin-only validation schemas (ADMIN role not allowed when creating/editing - only main admin has it)
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['MANAGER', 'DISPATCHER', 'DRIVER', 'USER'])
})

const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['MANAGER', 'DISPATCHER', 'DRIVER', 'USER']).optional(),
  isActive: z.boolean().optional(),
  isApproved: z.boolean().optional()
})

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

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role || 'USER'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as SignOptions
    )

    res.status(201).json({
      success: true,
      data: {
        user,
        token
      },
      message: 'User registered successfully'
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })

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

// ============ Admin-only routes (ADMIN role required) ============

// Get all users
router.get('/all-users', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return res.json({ success: true, data: users })
  } catch (error) {
    console.error('Get all users error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Create user (admin only)
router.post('/create-user', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        isActive: true,
        isApproved: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    })

    return res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Create user error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Update user (admin only)
router.put('/update-user/:userId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params
    const validatedData = updateUserSchema.parse(req.body)

    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const updateData: any = {}
    if (validatedData.email !== undefined) updateData.email = validatedData.email
    if (validatedData.firstName !== undefined) updateData.firstName = validatedData.firstName
    if (validatedData.lastName !== undefined) updateData.lastName = validatedData.lastName
    if (validatedData.role !== undefined && existingUser.role !== 'ADMIN') updateData.role = validatedData.role
    if (validatedData.isActive !== undefined) {
      if (existingUser.id === req.user!.id && !validatedData.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' })
      }
      updateData.isActive = validatedData.isActive
    }
    if (validatedData.isApproved !== undefined) {
      if (existingUser.id === req.user!.id && !validatedData.isApproved) {
        return res.status(400).json({ success: false, message: 'Cannot unapprove your own account' })
      }
      updateData.isApproved = validatedData.isApproved
    }
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isApproved: true,
        createdAt: true
      }
    })

    return res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Update user error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Delete user forever (admin only)
router.delete('/delete-user/:userId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { userId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    if (user.role === 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin user'
      })
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return res.json({
      success: true,
      message: 'User deleted permanently'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router