import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { serializeProductSummary } from "@/server/services/catalog";
import type { PromoBlock } from "@/shared/api-contract";

const promoInclude = {
  product: { include: { category: true, brand: true } },
} satisfies Prisma.PromoBlockInclude;

export type PromoBlockWithProduct = Prisma.PromoBlockGetPayload<{
  include: typeof promoInclude;
}>;

/** Only advertise products that can still be bought. */
export function promoBlockWhere(): Prisma.PromoBlockWhereInput {
  return { product: { stock: { gt: 0 } } };
}

export function serializePromoBlock(block: PromoBlockWithProduct): PromoBlock {
  return {
    id: block.id,
    title: block.title,
    text: block.text,
    product: serializeProductSummary(block.product),
  };
}

export async function listPromoBlocks(): Promise<PromoBlock[]> {
  const blocks = await prisma.promoBlock.findMany({
    where: promoBlockWhere(),
    include: promoInclude,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  return blocks.map(serializePromoBlock);
}
