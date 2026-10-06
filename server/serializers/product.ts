import "server-only";

import type { ProductWithRelations } from "@server/db/includes/product";
import { toMoney } from "@/shared/money";
import type { ProductDetail, ProductSummary } from "@/shared/api-contract";

/** Товар доступен к покупке, пока есть остаток. */
export function isAvailable(product: { stock: number }): boolean {
  return product.stock > 0;
}

export function serializeProductSummary(product: ProductWithRelations): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    price: toMoney(product.price),
    oldPrice: product.oldPrice != null ? toMoney(product.oldPrice) : undefined,
    imageUrl: product.imageUrl,
    stock: product.stock,
    available: isAvailable(product),
    rating: product.rating,
    category: {
      id: product.category.id,
      slug: product.category.slug,
      name: product.category.name,
    },
    brand: {
      id: product.brand.id,
      slug: product.brand.slug,
      name: product.brand.name,
    },
  };
}

export function serializeProduct(product: ProductWithRelations): ProductDetail {
  return {
    ...serializeProductSummary(product),
    specs: product.specs as Record<string, unknown>,
  };
}
