import type { Prisma, PrismaClient } from "@prisma/client";

/** Клиент или интерактивная TX (seed под advisory xact-lock). */
export type SeedDb = PrismaClient | Prisma.TransactionClient;

export const categories = [
  { slug: "graphics-cards", name: "Видеокарты" },
  { slug: "processors", name: "Процессоры" },
  { slug: "motherboards", name: "Материнские платы" },
  { slug: "memory", name: "Память" },
  { slug: "storage", name: "Накопители" },
  { slug: "power-supplies", name: "Блоки питания" },
  { slug: "cases", name: "Корпуса" },
  { slug: "cooling", name: "Охлаждение" },
  { slug: "peripherals", name: "Периферия" },
] as const;

export const brands = [
  { slug: "nvidia", name: "NVIDIA" },
  { slug: "amd", name: "AMD" },
  { slug: "intel", name: "Intel" },
  { slug: "asus", name: "ASUS" },
  { slug: "msi", name: "MSI" },
  { slug: "gigabyte", name: "Gigabyte" },
  { slug: "corsair", name: "Corsair" },
  { slug: "kingston", name: "Kingston" },
  { slug: "samsung", name: "Samsung" },
  { slug: "seasonic", name: "Seasonic" },
  { slug: "deepcool", name: "Deepcool" },
  { slug: "logitech", name: "Logitech" },
] as const;

export type SeedProduct = {
  slug: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  categorySlug: (typeof categories)[number]["slug"];
  brandSlug: (typeof brands)[number]["slug"];
  stock: number;
  rating: number;
  specs: Prisma.InputJsonValue;
  /** null — товар без картинки, чтобы в UI был виден placeholder. */
  imageUrl?: string | null;
  /** Не клонировать OC/White-варианты для разовых демо-SKU. */
  noVariants?: boolean;
  /**
   * Повторно выставлять `stock` на каждом seed.
   * По умолчанию выкл., чтобы рестарт не откатывал покупки;
   * вкл. для SKU, на stock которых завязаны демо-сценарии.
   */
  pinStock?: boolean;
};

export function productImage(seed: string): string {
  return `https://placehold.co/640x480/151c27/3dd6c6/png?text=${encodeURIComponent(seed)}`;
}

export function resolveImageUrl(product: SeedProduct): string | null {
  if (product.imageUrl !== undefined) return product.imageUrl;
  return productImage(product.slug.slice(0, 24));
}
