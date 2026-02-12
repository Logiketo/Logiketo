/*
  Warnings:

  - You are about to drop the column `value` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "value",
ADD COLUMN     "driverPay" DOUBLE PRECISION,
ADD COLUMN     "loadPay" DOUBLE PRECISION;
