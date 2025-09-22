-- DropForeignKey
ALTER TABLE "public"."Consumption" DROP CONSTRAINT "Consumption_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Consumption" DROP CONSTRAINT "Consumption_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Consumption" ALTER COLUMN "deviceId" DROP NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL,
ALTER COLUMN "day" DROP NOT NULL,
ALTER COLUMN "units" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Device" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "type" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Consumption" ADD CONSTRAINT "Consumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Consumption" ADD CONSTRAINT "Consumption_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
