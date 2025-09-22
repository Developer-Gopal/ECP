-- CreateTable
CREATE TABLE "public"."Consumption" (
    "id" SERIAL NOT NULL,
    "day" TEXT NOT NULL,
    "units" INTEGER NOT NULL,

    CONSTRAINT "Consumption_pkey" PRIMARY KEY ("id")
);
