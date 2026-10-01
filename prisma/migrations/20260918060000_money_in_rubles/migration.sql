-- AlterTable: rename money columns and convert kopecks → whole rubles
DROP INDEX IF EXISTS "Product_priceCents_idx";

ALTER TABLE "Product" RENAME COLUMN "priceCents" TO "price";
ALTER TABLE "Product" RENAME COLUMN "oldPriceCents" TO "oldPrice";
ALTER TABLE "Order" RENAME COLUMN "totalCents" TO "total";
ALTER TABLE "OrderItem" RENAME COLUMN "priceCentsSnapshot" TO "priceSnapshot";

UPDATE "Product" SET "price" = ROUND("price" / 100.0)::integer;
UPDATE "Product" SET "oldPrice" = ROUND("oldPrice" / 100.0)::integer WHERE "oldPrice" IS NOT NULL;
UPDATE "Order" SET "total" = ROUND("total" / 100.0)::integer;
UPDATE "OrderItem" SET "priceSnapshot" = ROUND("priceSnapshot" / 100.0)::integer;

CREATE INDEX "Product_price_idx" ON "Product"("price");
