import "server-only";

import type { PromoBlockWithProduct } from "@/server/db/includes/promo";
import { serializeProductSummary } from "@/server/serializers/product";
import type { PromoBlock } from "@/shared/api-contract";

export function serializePromoBlock(block: PromoBlockWithProduct): PromoBlock {
  return {
    id: block.id,
    title: block.title,
    text: block.text,
    product: serializeProductSummary(block.product),
  };
}
