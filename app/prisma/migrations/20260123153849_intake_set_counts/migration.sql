/*
  Warnings:

  - You are about to drop the column `intakeInjectorsPerSet` on the `ServiceRequest` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ServiceIntakeSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "injectorCount" INTEGER NOT NULL,
    CONSTRAINT "ServiceIntakeSet_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ServiceRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "customer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "intakeSetCount" INTEGER
);
INSERT INTO "new_ServiceRequest" ("createdAt", "customer", "id", "intakeSetCount", "serviceNumber", "status", "updatedAt") SELECT "createdAt", "customer", "id", "intakeSetCount", "serviceNumber", "status", "updatedAt" FROM "ServiceRequest";
DROP TABLE "ServiceRequest";
ALTER TABLE "new_ServiceRequest" RENAME TO "ServiceRequest";
CREATE UNIQUE INDEX "ServiceRequest_serviceNumber_key" ON "ServiceRequest"("serviceNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceIntakeSet_serviceRequestId_setNumber_key" ON "ServiceIntakeSet"("serviceRequestId", "setNumber");
