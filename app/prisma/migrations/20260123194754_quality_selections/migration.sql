-- CreateTable
CREATE TABLE "ServiceQualitySelection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "injectorNumber" INTEGER NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    CONSTRAINT "ServiceQualitySelection_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceQualitySelection_serviceRequestId_setNumber_injectorNumber_key" ON "ServiceQualitySelection"("serviceRequestId", "setNumber", "injectorNumber");
