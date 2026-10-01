import type { SeedProduct } from "./types";

export function expandCatalog(base: readonly SeedProduct[]): SeedProduct[] {
  const extras: SeedProduct[] = [];
  const variants = [
    { suffix: "oc", title: " OC", priceMul: 1.08, stockDelta: -3 },
    { suffix: "white", title: " White", priceMul: 1.05, stockDelta: -5 },
  ];

  for (const item of base) {
    if (item.noVariants) continue;
    for (const v of variants) {
      if (item.categorySlug === "peripherals" && v.suffix === "oc") continue;
      extras.push({
        ...item,
        slug: `${item.slug}-${v.suffix}`,
        title: `${item.title}${v.title}`,
        price: Math.round(item.price * v.priceMul),
        oldPrice: item.oldPrice
          ? Math.round(item.oldPrice * v.priceMul)
          : undefined,
        stock: Math.max(1, item.stock + v.stockDelta),
        rating: Math.min(5, Number((item.rating + 0.05).toFixed(1))),
        pinStock: false,
      });
    }
  }

  return [...base, ...extras];
}
