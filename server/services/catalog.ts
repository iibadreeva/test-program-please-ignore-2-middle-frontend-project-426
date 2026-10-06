import "server-only";

import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ProductWithRelations } from "@server/db/includes/product";
import * as catalogRepository from "@server/repositories/catalog.repository";
import {
  isAvailable,
  serializeProduct,
  serializeProductSummary,
} from "@server/serializers/product";
import { PRODUCTS_PER_PAGE } from "@/shared/api-contract";
import type { ProductSummary } from "@/shared/api-contract";
import { MAX_CART_IDS } from "@/shared/constants";

export type { ProductWithRelations };
export { isAvailable, serializeProduct, serializeProductSummary };

export type ProductSort = "price_asc" | "price_desc" | "rating_desc" | "newest";

export type ListProductsInput = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

const MAX_PER_PAGE = 48;

/**
 * TTL data-cache витрины. Остатки eventual-consistent до 60s (или до
 * revalidateTag("catalog") после checkout): заказ всё равно валидирует stock
 * на сервере — витрина может кратко показывать «в наличии» после чужой покупки.
 */
const CATALOG_REVALIDATE_SECONDS = 60;

const PRODUCT_SORT_SCHEMA = z.enum(["price_asc", "price_desc", "rating_desc", "newest"]);

const catalogProductsCachePayloadSchema = z.object({
  category: z.string().nullable(),
  brand: z.string().nullable(),
  minPrice: z.number().nullable(),
  maxPrice: z.number().nullable(),
  available: z.boolean().nullable(),
  /** Всегда null: текстовый поиск в Data Cache не кладём (см. shouldCacheProductList). */
  search: z.null(),
  sort: PRODUCT_SORT_SCHEMA.nullable(),
  page: z.number().nullable(),
  perPage: z.number().nullable(),
});

type CatalogProductsCachePayload = z.infer<typeof catalogProductsCachePayloadSchema>;

/** Свободный search даёт неограниченную кардинальность ключей — в unstable_cache не идёт. */
export function shouldCacheProductList(input: ListProductsInput): boolean {
  return !input.search?.trim();
}

/**
 * Стабильный ключ фильтров для unstable_cache: явный порядок полей,
 * чтобы разные перестановки одного input не давали разные записи.
 * Валидируем payload до stringify — битый sort / непустой search не попадёт в Data Cache.
 */
export function catalogProductsCacheKey(input: ListProductsInput): string {
  if (!shouldCacheProductList(input)) {
    throw new Error("Некорректный ключ кэша каталога: search не кэшируется");
  }
  const payload = {
    category: input.category ?? null,
    brand: input.brand ?? null,
    minPrice: input.minPrice ?? null,
    maxPrice: input.maxPrice ?? null,
    available: input.available ?? null,
    search: null,
    sort: input.sort ?? null,
    page: input.page ?? null,
    perPage: input.perPage ?? null,
  };
  const parsed = catalogProductsCachePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Некорректный ключ кэша каталога");
  }
  return JSON.stringify(parsed.data satisfies CatalogProductsCachePayload);
}

/** Обратный разбор ключа для единственного unstable_cache(fn)(cacheKey). */
export function listProductsInputFromCacheKey(cacheKey: string): ListProductsInput {
  let raw: unknown;
  try {
    raw = JSON.parse(cacheKey);
  } catch {
    throw new Error("Некорректный ключ кэша каталога");
  }
  const parsed = catalogProductsCachePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Некорректный ключ кэша каталога");
  }
  const payload = parsed.data;
  return {
    category: payload.category ?? undefined,
    brand: payload.brand ?? undefined,
    minPrice: payload.minPrice ?? undefined,
    maxPrice: payload.maxPrice ?? undefined,
    available: payload.available ?? undefined,
    sort: payload.sort ?? undefined,
    page: payload.page ?? undefined,
    perPage: payload.perPage ?? undefined,
  };
}

/**
 * Собирает WHERE по четырём осям фильтров. Без вызовов Prisma — комбинацию
 * фильтров можно юнит-тестировать без базы.
 */
export function buildProductWhere(input: ListProductsInput): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (input.category) {
    where.category = { slug: input.category };
  }
  if (input.brand) {
    where.brand = { slug: input.brand };
  }
  if (input.minPrice != null || input.maxPrice != null) {
    where.price = {};
    if (input.minPrice != null) where.price.gte = input.minPrice;
    if (input.maxPrice != null) where.price.lte = input.maxPrice;
  }
  if (input.available === true) {
    where.stock = { gt: 0 };
  } else if (input.available === false) {
    where.stock = { lte: 0 };
  }

  const search = input.search?.trim();
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  return where;
}

/**
 * Тай-брейкер по `id` стабилизирует пагинацию: у сидированных товаров почти
 * одинаковые `createdAt` и цены, один ключ сортировки оставляет порядок неопределённым.
 */
export function buildProductOrderBy(
  sort: ProductSort = "newest",
): Prisma.ProductOrderByWithRelationInput[] {
  const primary: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : sort === "rating_desc"
          ? { rating: "desc" }
          : { createdAt: "desc" };

  return [primary, { id: "asc" }];
}

/**
 * Клампит запрошенную страницу в существующий диапазон: выход за пределы
 * показывает последнюю страницу, а не пустой список.
 */
export function normalizePagination(input: {
  page?: number;
  perPage?: number;
  total: number;
}): PaginationMeta {
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.trunc(input.perPage ?? PRODUCTS_PER_PAGE)));
  const total = Math.max(0, input.total);
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const requested = Math.max(1, Math.trunc(input.page ?? 1));
  const page = Math.min(requested, totalPages);

  return { page, perPage, total, totalPages };
}

async function loadCategories() {
  return catalogRepository.findCategoriesOrdered();
}

async function loadBrands() {
  return catalogRepository.findBrandsOrdered();
}

async function loadProducts(input: ListProductsInput) {
  const where = buildProductWhere(input);
  const orderBy = buildProductOrderBy(input.sort);
  // Те же границы, что в normalizePagination: страницу 1 можно читать параллельно с count.
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, Math.trunc(input.perPage ?? PRODUCTS_PER_PAGE)));
  const requested = Math.max(1, Math.trunc(input.page ?? 1));

  const [total, firstPage] = await Promise.all([
    catalogRepository.countProducts(where),
    catalogRepository.findProductsPage({
      where,
      orderBy,
      skip: (requested - 1) * perPage,
      take: perPage,
    }),
  ]);

  const meta = normalizePagination({ page: requested, perPage, total });
  // Запрошенная страница за пределами выдачи: count уже есть, дочитываем крайнюю.
  const items =
    meta.page === requested
      ? firstPage
      : await catalogRepository.findProductsPage({
          where,
          orderBy,
          skip: (meta.page - 1) * meta.perPage,
          take: meta.perPage,
        });

  return { items: items.map(serializeProductSummary), meta };
}

/**
 * Маркер miss для unstable_cache: thrown errors Next не кладёт в Data Cache,
 * в отличие от `null` — иначе 404 slug «залипает» на TTL.
 */
class ProductSlugCacheMiss extends Error {
  constructor(slug: string) {
    super(slug);
    this.name = "ProductSlugCacheMiss";
  }
}

function isProductSlugCacheMiss(error: unknown): boolean {
  return (
    error instanceof ProductSlugCacheMiss ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ProductSlugCacheMiss")
  );
}

async function loadProductBySlugCached(slug: string) {
  const product = await catalogRepository.findProductBySlug(slug);
  if (!product) throw new ProductSlugCacheMiss(slug);
  return serializeProduct(product);
}

async function loadProductsByCacheKey(cacheKey: string) {
  return loadProducts(listProductsInputFromCacheKey(cacheKey));
}

const getCachedCategories = unstable_cache(loadCategories, ["catalog-categories"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ["catalog"],
});

const getCachedBrands = unstable_cache(loadBrands, ["catalog-brands"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ["catalog"],
});

/** Аргумент cacheKey входит в ключ Data Cache — обёртка одна на модуль. */
const getCachedProductList = unstable_cache(loadProductsByCacheKey, ["catalog-products"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ["catalog"],
});

const getCachedProductBySlug = unstable_cache(loadProductBySlugCached, ["catalog-product-by-slug"], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: ["catalog"],
});

export async function listCategories() {
  return getCachedCategories();
}

export async function listBrands() {
  return getCachedBrands();
}

export async function listProducts(input: ListProductsInput = {}) {
  if (!shouldCacheProductList(input)) {
    return loadProducts(input);
  }
  return getCachedProductList(catalogProductsCacheKey(input));
}

export async function getProductBySlug(slug: string) {
  try {
    return await getCachedProductBySlug(slug);
  } catch (error) {
    if (isProductSlugCacheMiss(error)) return null;
    throw error;
  }
}

/** Разрешить refs корзины в актуальные ProductSummary. Порядок как в `ids`. */
export async function listProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))].slice(0, MAX_CART_IDS);
  if (unique.length === 0) return [];

  const products = await catalogRepository.findProductsByIds(unique);
  const byId = new Map(products.map((product) => [product.id, serializeProductSummary(product)]));
  return unique.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
