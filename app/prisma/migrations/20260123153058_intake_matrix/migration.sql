-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN "intakeInjectorsPerSet" INTEGER;
ALTER TABLE "ServiceRequest" ADD COLUMN "intakeSetCount" INTEGER;

-- CreateTable
CREATE TABLE "ServiceIntakeInjector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "injectorNumber" INTEGER NOT NULL,
    "serialNumber" TEXT,
    CONSTRAINT "ServiceIntakeInjector_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceIntakeInjector_serviceRequestId_setNumber_injectorNumber_key" ON "ServiceIntakeInjector"("serviceRequestId", "setNumber", "injectorNumber");
