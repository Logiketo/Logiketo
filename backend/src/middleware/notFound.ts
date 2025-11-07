import { Request, Response, NextFunction } from 'express'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // Don't create error for favicon or uploads - just return 404 silently
  if (req.originalUrl === '/favicon.ico' || req.originalUrl.startsWith('/uploads/')) {
    return res.status(404).end()
  }
  
  const error = new Error(`Not Found - ${req.originalUrl}`) as any
  error.statusCode = 404
  res.status(404)
  next(error)
}
