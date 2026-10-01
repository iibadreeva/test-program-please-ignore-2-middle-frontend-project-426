-- Самовывоз без пунктов выдачи: убираем неиспользуемую связь и таблицу.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_pickupPointId_fkey";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "pickupPointId";
DROP TABLE IF EXISTS "PickupPoint";
