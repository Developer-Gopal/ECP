/*
  Warnings:

  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firebaseId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `firebaseId` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "public"."User_phoneNumber_key";

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "createdAt",
DROP COLUMN "otp",
DROP COLUMN "otpExpiry",
DROP COLUMN "phoneNumber",
ADD COLUMN     "firebaseId" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseId_key" ON "public"."User"("firebaseId");
