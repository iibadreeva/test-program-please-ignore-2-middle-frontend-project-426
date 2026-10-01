import "server-only";

import { Prisma } from "@prisma/client";
import { productInclude } from "@/server/db/includes/product";

/** Промо-блок отдаёт вложенный товар в том же виде, что каталог. */
export const promoInclude = {
  product: { include: productInclude },
} satisfies Prisma.PromoBlockInclude;

export type PromoBlockWithProduct = Prisma.PromoBlockGetPayload<{
  include: typeof promoInclude;
}>;
