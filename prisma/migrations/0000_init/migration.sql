-- CreateTable
CREATE TABLE "CrimeIncident" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceIncidentId" TEXT NOT NULL,
    "incidentNum" TEXT,
    "caseNumber" TEXT,
    "offenseCode" TEXT,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "locationName" TEXT,
    "address" TEXT,
    "crossStreet" TEXT,
    "agency" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3),
    "typeId" TEXT,
    "typeIconUrl" TEXT,
    "mapItId" TEXT,
    "disposition" TEXT,
    "raw" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrimeIncident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrimeIncident_sourceIncidentId_key" ON "CrimeIncident"("sourceIncidentId");

-- CreateIndex
CREATE INDEX "CrimeIncident_occurredAt_idx" ON "CrimeIncident"("occurredAt");
