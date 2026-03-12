import express from 'express'
import { PrismaClient } from '@prisma/client'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = express.Router()
const prisma = new PrismaClient()

// Keys used for site content
const MOTIVATION_QUOTE = 'motivation_quote'
const ABOUT_INTRO = 'about_intro'
const ABOUT_P1 = 'about_p1'
const ABOUT_P2 = 'about_p2'
const ABOUT_P3 = 'about_p3'
const ABOUT_P4 = 'about_p4'

const CONTENT_KEYS = [MOTIVATION_QUOTE, ABOUT_INTRO, ABOUT_P1, ABOUT_P2, ABOUT_P3, ABOUT_P4] as const

// Get content by key (public for landing/about, or by key for dashboard)
router.get('/', async (req, res) => {
  try {
    const { key } = req.query
    if (typeof key === 'string') {
      const row = await prisma.siteContent.findUnique({ where: { key } })
      return res.json({ success: true, data: row ? { key: row.key, value: row.value } : null })
    }
    // Get all content
    const rows = await prisma.siteContent.findMany({
      where: { key: { in: [...CONTENT_KEYS] } }
    })
    const content: Record<string, string> = {}
    for (const row of rows) content[row.key] = row.value
    return res.json({ success: true, data: content })
  } catch (error) {
    console.error('Get content error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Get About page content (public, no auth)
router.get('/about', async (req, res) => {
  try {
    const rows = await prisma.siteContent.findMany({
      where: { key: { in: [ABOUT_INTRO, ABOUT_P1, ABOUT_P2, ABOUT_P3, ABOUT_P4] } }
    })
    const content: Record<string, string> = {}
    for (const row of rows) content[row.key] = row.value
    return res.json({ success: true, data: content })
  } catch (error) {
    console.error('Get about content error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Update content (admin only)
router.put('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' })
    }
    const { key, value } = req.body
    if (!key || !CONTENT_KEYS.includes(key)) {
      return res.status(400).json({ success: false, message: 'Invalid key' })
    }
    const row = await prisma.siteContent.upsert({
      where: { key },
      create: { key, value: String(value ?? '') },
      update: { value: String(value ?? '') }
    })
    return res.json({ success: true, data: row })
  } catch (error) {
    console.error('Update content error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

// Bulk update content (admin only)
router.put('/bulk', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin role required.' })
    }
    const body = req.body as Record<string, string>
    for (const key of CONTENT_KEYS) {
      if (body[key] !== undefined) {
        await prisma.siteContent.upsert({
          where: { key },
          create: { key, value: String(body[key] ?? '') },
          update: { value: String(body[key] ?? '') }
        })
      }
    }
    return res.json({ success: true, message: 'Content updated' })
  } catch (error) {
    console.error('Bulk update content error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
})

export default router
