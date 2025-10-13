const { PrismaClient } = require('@prisma/client')

async function addApprovalColumn() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Adding isApproved column to users table...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Add the isApproved column
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
    `
    
    console.log('✅ isApproved column added')
    
    // Update existing users to be approved
    await prisma.$executeRaw`
      UPDATE "users" SET "isApproved" = true WHERE "isApproved" = false;
    `
    
    console.log('✅ All existing users marked as approved')
    
    // Make sales@logiketo.com admin
    await prisma.$executeRaw`
      UPDATE "users" 
      SET "role" = 'ADMIN', "isApproved" = true, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "email" = 'sales@logiketo.com'
    `
    
    console.log('🎉 sales@logiketo.com is now an ADMIN!')
    
  } catch (error) {
    console.error('❌ Error adding approval column:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addApprovalColumn()
