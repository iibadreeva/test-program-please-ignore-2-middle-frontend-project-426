import type { SeedDb } from "./types";
import { promoBlocks } from "./promo-data";

export type PromoBlockSeedInput = {
  productSlug: string;
  title: string;
  text: string;
  sortOrder: number;
};

/**
 * Upsert промо главной по productId.
 * Пропускает отсутствующие/OOS товары.
 *
 * Асимметрия cleanup намеренная:
 * - partial success (≥1 блок засеян) → deleteMany orphan'ов (`productId notIn seeded`):
 *   OOS/missing из конфига тоже уходят с витрины (устаревшие промо не висят).
 * - total skip (конфиг непустой, но 0 засеяно) → существующие блоки НЕ трогаем,
 *   чтобы сбой каталога/временно OOS не обнулил всю главную.
 * - пустой `blocks` → полный wipe (намеренная очистка витрины).
 */
export async function seedPromos(
  prisma: SeedDb,
  blocks: readonly PromoBlockSeedInput[] = promoBlocks,
): Promise<number> {
  const seededProductIds: string[] = [];
  let skipped = 0;

  for (const promo of blocks) {
    const product = await prisma.product.findUnique({
      where: { slug: promo.productSlug },
      select: { id: true, stock: true },
    });

    if (!product) {
      skipped += 1;
      console.warn(`Promo seed skipped: product "${promo.productSlug}" not found.`);
      continue;
    }
    if (product.stock <= 0) {
      skipped += 1;
      console.warn(`Promo seed skipped: product "${promo.productSlug}" is out of stock.`);
      continue;
    }

    await prisma.promoBlock.upsert({
      where: { productId: product.id },
      create: {
        title: promo.title,
        text: promo.text,
        sortOrder: promo.sortOrder,
        productId: product.id,
      },
      update: {
        title: promo.title,
        text: promo.text,
        sortOrder: promo.sortOrder,
      },
    });
    seededProductIds.push(product.id);
  }

  if (seededProductIds.length === 0) {
    if (blocks.length === 0) {
      // Пустой конфиг — намеренно очищаем витрину.
      await prisma.promoBlock.deleteMany();
    } else {
      console.warn(
        `Promo seed: 0/${blocks.length} блоков засеяно (${skipped} skipped); ` +
          "существующие promo blocks не удаляем.",
      );
    }
    return 0;
  }

  await prisma.promoBlock.deleteMany({
    where: { productId: { notIn: seededProductIds } },
  });

  return seededProductIds.length;
}
