-- Индексы под cleanup сессий, кабинет заказов и каталог.
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- Композиты совпадают с orderBy (price|createdAt|rating) + id в catalog.ts.
DROP INDEX IF EXISTS "Product_price_idx";
CREATE INDEX "Product_price_id_idx" ON "Product"("price", "id");
CREATE INDEX "Product_createdAt_id_idx" ON "Product"("createdAt", "id");
CREATE INDEX "Product_rating_id_idx" ON "Product"("rating", "id");
-- Фильтр available: stock gt/lte 0.
CREATE INDEX "Product_stock_idx" ON "Product"("stock");

DROP INDEX IF EXISTS "Order_userId_idx";
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
