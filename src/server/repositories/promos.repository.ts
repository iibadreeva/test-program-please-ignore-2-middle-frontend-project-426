import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { promoInclude } from "@/server/db/includes/promo";

/** Тонкий доступ к PromoBlock: where/сериализация — в services/promos. */

export async function findPromoBlocks(where: Prisma.PromoBlockWhereInput) {
  return prisma.promoBlock.findMany({
    where,
    include: promoInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}
