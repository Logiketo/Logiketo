import { Request, Response, NextFunction } from 'express'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // Don't log errors for favicon or common missing files
  if (req.originalUrl === '/favicon.ico' || req.originalUrl.startsWith('/uploads/')) {
    return res.status(404).json({ success: false, message: 'Not Found' })
  }
  const error = new Error(`Not Found - ${req.originalUrl}`) as any
  res.status(404)
  next(error)
}
