-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_vehicleId_key" ON "units"("vehicleId");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
