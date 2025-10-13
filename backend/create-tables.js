const { PrismaClient } = require('@prisma/client')

async function createTables() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Creating database tables...')
    
    // Connect to database
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Create tables using raw SQL
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `
    
    console.log('✅ Users table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT,
        "phone" TEXT,
        "address" TEXT,
        "city" TEXT,
        "state" TEXT,
        "zipCode" TEXT,
        "country" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "createdById" TEXT NOT NULL
      );
    `
    
    console.log('✅ Customers table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "make" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "year" INTEGER NOT NULL,
        "licensePlate" TEXT NOT NULL UNIQUE,
        "vin" TEXT UNIQUE,
        "color" TEXT,
        "capacity" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "driverId" TEXT,
        "unitNumber" TEXT,
        "driverName" TEXT,
        "dimensions" TEXT,
        "payload" TEXT,
        "registrationExpDate" TEXT,
        "insuranceExpDate" TEXT,
        "insuranceDocument" TEXT,
        "registrationDocument" TEXT,
        "documents" JSONB
      );
    `
    
    console.log('✅ Vehicles table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderNumber" TEXT NOT NULL UNIQUE,
        "customerId" TEXT NOT NULL,
        "vehicleId" TEXT,
        "driverId" TEXT,
        "employeeId" TEXT,
        "customerLoadNumber" TEXT,
        "pickupAddress" TEXT NOT NULL,
        "deliveryAddress" TEXT NOT NULL,
        "pickupDate" TIMESTAMP(3) NOT NULL,
        "deliveryDate" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "description" TEXT,
        "miles" DOUBLE PRECISION,
        "pieces" INTEGER,
        "weight" DOUBLE PRECISION,
        "loadPay" DOUBLE PRECISION,
        "driverPay" DOUBLE PRECISION,
        "notes" TEXT,
        "document" TEXT,
        "documents" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `
    
    console.log('✅ Orders table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "employees" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "employeeId" TEXT NOT NULL UNIQUE,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "phone" TEXT,
        "position" TEXT NOT NULL,
        "department" TEXT,
        "hireDate" TIMESTAMP(3) NOT NULL,
        "salary" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "address" TEXT,
        "emergencyContact" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `
    
    console.log('✅ Employees table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "units" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "vehicleId" TEXT NOT NULL UNIQUE,
        "unitNumber" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "dimensions" TEXT,
        "payload" TEXT,
        "notes" TEXT,
        "availability" TEXT,
        "location" TEXT,
        "zipCode" TEXT,
        "availableTime" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `
    
    console.log('✅ Units table created')
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "tracking_events" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "orderId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "location" TEXT,
        "latitude" DOUBLE PRECISION,
        "longitude" DOUBLE PRECISION,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "notes" TEXT
      );
    `
    
    console.log('✅ Tracking events table created')
    
    // Add foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "customers" ADD CONSTRAINT "customers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "orders" ADD CONSTRAINT "orders_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "units" ADD CONSTRAINT "units_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `
    
    await prisma.$executeRaw`
      ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    `
    
    console.log('✅ Foreign key constraints added')
    
    await prisma.$disconnect()
    console.log('🎉 All database tables created successfully!')
    
  } catch (error) {
    console.error('❌ Error creating tables:', error)
    process.exit(1)
  }
}

createTables()
