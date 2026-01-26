-- CreateTable
CREATE TABLE "ServiceCleaningRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceCleaningRound_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceCleaningEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceRequestId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "roundIndex" INTEGER NOT NULL,
    "injectorNumber" INTEGER NOT NULL,
    "flowValue" TEXT,
    "note" TEXT,
    CONSTRAINT "ServiceCleaningEntry_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "ServiceRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCleaningRound_serviceRequestId_setNumber_roundIndex_key" ON "ServiceCleaningRound"("serviceRequestId", "setNumber", "roundIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCleaningEntry_serviceRequestId_setNumber_roundIndex_injectorNumber_key" ON "ServiceCleaningEntry"("serviceRequestId", "setNumber", "roundIndex", "injectorNumber");
