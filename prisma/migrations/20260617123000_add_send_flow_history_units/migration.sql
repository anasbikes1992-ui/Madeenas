-- Add unit matrix fields on Product
ALTER TABLE "Product"
ADD "alternateUnit" TEXT,
ADD "conversionFactor" DOUBLE PRECISION;

-- Add direct send / discrepancy fields on StockOutRequest
ALTER TABLE "StockOutRequest"
ADD "transferNo" TEXT,
ADD "flowType" TEXT NOT NULL DEFAULT 'REQUEST',
ADD "quantityDispatched" DOUBLE PRECISION,
ADD "quantityReceived" DOUBLE PRECISION,
ADD "discrepancyQty" DOUBLE PRECISION,
ADD "discrepancyReason" TEXT,
ADD "acknowledgeNote" TEXT;

CREATE UNIQUE INDEX "StockOutRequest_transferNo_key" ON "StockOutRequest"("transferNo");
CREATE INDEX "StockOutRequest_flowType_status_idx" ON "StockOutRequest"("flowType", "status");

-- Add generic entity history table
CREATE TABLE "EntityHistory" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "payloadJson" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EntityHistory_entityType_entityId_createdAt_idx" ON "EntityHistory"("entityType", "entityId", "createdAt");
CREATE INDEX "EntityHistory_createdBy_createdAt_idx" ON "EntityHistory"("createdBy", "createdAt");

ALTER TABLE "EntityHistory"
ADD CONSTRAINT "EntityHistory_createdBy_fkey"
FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
