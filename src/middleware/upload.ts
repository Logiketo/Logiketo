import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  }
})

// File filter to allow only specific file types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|pdf/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'))
  }
}

// Configure multer
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: fileFilter
})

// Middleware for vehicle document uploads
export const uploadVehicleDocuments = upload.fields([
  { name: 'insuranceDocument', maxCount: 1 },
  { name: 'registrationDocument', maxCount: 1 },
  { name: 'document_0', maxCount: 1 },
  { name: 'document_1', maxCount: 1 },
  { name: 'document_2', maxCount: 1 },
  { name: 'document_3', maxCount: 1 },
  { name: 'document_4', maxCount: 1 }
])

// Middleware for order document uploads
export const uploadOrderDocuments = upload.fields([
  { name: 'document_0', maxCount: 1 },
  { name: 'document_1', maxCount: 1 },
  { name: 'document_2', maxCount: 1 },
  { name: 'document_3', maxCount: 1 },
  { name: 'document_4', maxCount: 1 }
])