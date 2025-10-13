const { PrismaClient } = require('@prisma/client')

async function fixDatabase() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔄 Fixing database...')
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Create custom types
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✅ UserRole type created')
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'BUSY', 'MAINTENANCE', 'OUT_OF_SERVICE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✅ VehicleStatus type created')
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✅ OrderStatus type created')
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "OrderPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✅ OrderPriority type created')
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✅ EmployeeStatus type created')
    
    // Create tables
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "firstName" TEXT NOT NULL,
        "lastName" TEXT NOT NULL,
        "role" "UserRole" NOT NULL DEFAULT 'USER',
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
        "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
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
        "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
        "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
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
        "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
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
    
    console.log('🎉 Database fixed successfully!')
    
  } catch (error) {
    console.error('❌ Error fixing database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabase()
