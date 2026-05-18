-- AlterTable
ALTER TABLE "StockOutRequest" ADD COLUMN     "dispatchedBy" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "receivedBy" TEXT;

-- AddForeignKey
ALTER TABLE "StockOutRequest" ADD CONSTRAINT "StockOutRequest_dispatchedBy_fkey" FOREIGN KEY ("dispatchedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOutRequest" ADD CONSTRAINT "StockOutRequest_receivedBy_fkey" FOREIGN KEY ("receivedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
