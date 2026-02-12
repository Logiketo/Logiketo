-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerLoadNumber" TEXT,
ADD COLUMN     "document" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "miles" DOUBLE PRECISION,
ADD COLUMN     "pieces" INTEGER;
