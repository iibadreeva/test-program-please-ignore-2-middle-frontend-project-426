-- CreateTable
CREATE TABLE "PromoBlock" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoBlock_productId_key" ON "PromoBlock"("productId");

-- CreateIndex
CREATE INDEX "PromoBlock_sortOrder_idx" ON "PromoBlock"("sortOrder");

-- AddForeignKey
ALTER TABLE "PromoBlock" ADD CONSTRAINT "PromoBlock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
