import { brands, categories, resolveImageUrl, type SeedDb } from "./types";
import { catalog } from "./catalog-data";
import { expandCatalog } from "./expand-catalog";
import { seedPromos } from "./seed-promos";

export type { SeedDb };

export async function seedCatalog(prisma: SeedDb) {
  // Последовательно: interactive TX + Promise.all у Prisma нежелательны.
  const categoryRecords = [];
  for (const c of categories) {
    categoryRecords.push(
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: c,
        update: { name: c.name },
      }),
    );
  }

  const brandRecords = [];
  for (const b of brands) {
    brandRecords.push(
      await prisma.brand.upsert({
        where: { slug: b.slug },
        create: b,
        update: { name: b.name },
      }),
    );
  }

  const categoryBySlug = new Map(categoryRecords.map((c) => [c.slug, c.id]));
  const brandBySlug = new Map(brandRecords.map((b) => [b.slug, b.id]));

  const products = expandCatalog(catalog);

  for (const p of products) {
    const categoryId = categoryBySlug.get(p.categorySlug);
    const brandId = brandBySlug.get(p.brandSlug);
    if (!categoryId || !brandId) {
      throw new Error(
        `Seed: неизвестная категория/бренд для "${p.slug}" (${p.categorySlug}/${p.brandSlug})`,
      );
    }

    const createData = {
      slug: p.slug,
      title: p.title,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      imageUrl: resolveImageUrl(p),
      stock: p.stock,
      rating: p.rating,
      specs: p.specs,
      categoryId,
      brandId,
    };

    // При рестарте обновляем карточку: title/price/oldPrice/specs и связи.
    // rating не затираем (может отражать накопленные оценки); stock — только pinStock.
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: createData,
      update: {
        title: createData.title,
        description: createData.description,
        price: createData.price,
        oldPrice: createData.oldPrice,
        imageUrl: createData.imageUrl,
        specs: createData.specs,
        categoryId: createData.categoryId,
        brandId: createData.brandId,
        ...(p.pinStock ? { stock: createData.stock } : {}),
      },
    });
  }

  const promoCount = await seedPromos(prisma);

  const withoutImage = products.filter((p) => resolveImageUrl(p) === null).length;
  const unavailable = products.filter((p) => p.stock <= 0).length;

  console.log(
    `Seeded ${categoryRecords.length} categories, ${brandRecords.length} brands, ` +
      `${products.length} products (${withoutImage} without image, ${unavailable} unavailable), ` +
      `${promoCount} promo blocks.`,
  );
}
