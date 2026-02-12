import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string }
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true }
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Token is not valid' })
    }

    req.user = user
    next()
    return
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' })
    return
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    next()
    return
  }
}
