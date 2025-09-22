/*
  Warnings:

  - You are about to drop the column `amount` on the `Consumption` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Consumption` table. All the data in the column will be lost.
  - Added the required column `day` to the `Consumption` table without a default value. This is not possible if the table is not empty.
  - Added the required column `units` to the `Consumption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Consumption" DROP COLUMN "amount",
DROP COLUMN "date",
ADD COLUMN     "day" TEXT NOT NULL,
ADD COLUMN     "units" INTEGER NOT NULL;
