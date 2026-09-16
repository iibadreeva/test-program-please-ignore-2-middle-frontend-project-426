-- Deduplicate pickup points before enforcing unique name (keep lowest id per name).
DELETE FROM "PickupPoint" a
USING "PickupPoint" b
WHERE a.name = b.name
  AND a.id > b.id;

-- CreateIndex
CREATE UNIQUE INDEX "PickupPoint_name_key" ON "PickupPoint"("name");
