import "server-only";

import { unstable_cache } from "next/cache";
import type { Prisma } from "@prisma/client";
import type { PromoBlockWithProduct } from "@server/db/includes/promo";
import { findPromoBlocks } from "@server/repositories/promos.repository";
import { serializePromoBlock } from "@server/serializers/promo";
import type { PromoBlock } from "@/shared/api-contract";

export type { PromoBlockWithProduct };
export { serializePromoBlock };

/**
 * TTL промо на главной — как у каталога. Stock в фильтре eventual-consistent
 * до revalidateTag("promos") после checkout (см. CATALOG_REVALIDATE_SECONDS).
 */
const PROMOS_REVALIDATE_SECONDS = 60;

/** Промо только для товаров, которые ещё можно купить. */
export function promoBlockWhere(): Prisma.PromoBlockWhereInput {
  return { product: { stock: { gt: 0 } } };
}

async function loadPromoBlocks(): Promise<PromoBlock[]> {
  const blocks = await findPromoBlocks(promoBlockWhere());
  return blocks.map(serializePromoBlock);
}

const getCachedPromoBlocks = unstable_cache(loadPromoBlocks, ["home-promos"], {
  revalidate: PROMOS_REVALIDATE_SECONDS,
  tags: ["catalog", "promos"],
});

export async function listPromoBlocks(): Promise<PromoBlock[]> {
  return getCachedPromoBlocks();
}
