-- Единственный статус заказа — «Оплачен».
-- Все прежние значения enum (включая CANCELLED) схлопываем в PAID без DELETE:
-- строки заказов и позиций сохраняются.
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE text USING 'PAID';
DROP TYPE "OrderStatus";
CREATE TYPE "OrderStatus" AS ENUM ('PAID');
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PAID';
