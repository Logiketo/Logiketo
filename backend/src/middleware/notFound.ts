import { Request, Response, NextFunction } from 'express'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // For favicon and uploads, just return 404 without logging
  if (req.originalUrl === '/favicon.ico' || req.originalUrl.startsWith('/uploads/')) {
    return res.status(404).end()
  }
  // For other 404s, set status and pass to error handler
  const error = new Error(`Not Found - ${req.originalUrl}`) as any
  error.statusCode = 404
  res.status(404)
  next(error)
}
