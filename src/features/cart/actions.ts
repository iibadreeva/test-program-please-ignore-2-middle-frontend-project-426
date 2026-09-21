"use server";

import { z } from "zod";
import { listProductsByIds } from "@/server/services/catalog";
import type { ProductSummary } from "@/shared/api-contract";
import { MAX_CART_IDS } from "@/shared/constants";

const cartProductIdsSchema = z
  .array(z.string().min(1))
  .max(MAX_CART_IDS)
  .transform((ids) => [...new Set(ids)]);

/** Актуальные строки каталога для refs из localStorage. Не входит в публичный OpenAPI. */
export async function getCartProducts(ids: string[]): Promise<ProductSummary[]> {
  const parsed = cartProductIdsSchema.safeParse(ids);
  if (!parsed.success) {
    throw new Error(`В корзине не больше ${MAX_CART_IDS} позиций`);
  }

  return listProductsByIds(parsed.data);
}
