-- Поле comment больше не используется в API и UI.
ALTER TABLE "Order" DROP COLUMN IF EXISTS "comment";
