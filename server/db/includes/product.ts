import "server-only";

import { Prisma } from "@prisma/client";

/** Категория и бренд нужны и списку, и карточке товара. */
export const productInclude = {
  category: true,
  brand: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
