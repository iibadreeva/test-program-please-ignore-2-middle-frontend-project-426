import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { toMoney } from "@/shared/money";
import { PRODUCTS_PER_PAGE } from "@/shared/api-contract";
import type { ProductDetail, ProductSummary } from "@/shared/api-contract";
import { MAX_CART_IDS } from "@/shared/constants";

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

const productInclude = {
  category: true,
  brand: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

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
  if (input.available) {
    where.stock = { gt: 0 };
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

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function listBrands() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } });
}

export async function listPickupPoints() {
  return prisma.pickupPoint.findMany({ orderBy: { name: "asc" } });
}

export async function listProducts(input: ListProductsInput = {}) {
  const where = buildProductWhere(input);

  // Сначала count: номер страницы можно клампить только зная total.
  const total = await prisma.product.count({ where });
  const meta = normalizePagination({ page: input.page, perPage: input.perPage, total });

  const items = await prisma.product.findMany({
    where,
    include: productInclude,
    orderBy: buildProductOrderBy(input.sort),
    skip: (meta.page - 1) * meta.perPage,
    take: meta.perPage,
  });

  return { items: items.map(serializeProductSummary), meta };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  return product ? serializeProduct(product) : null;
}

/** Разрешить refs корзины в актуальные ProductSummary. Порядок как в `ids`. */
export async function listProductsByIds(ids: string[]): Promise<ProductSummary[]> {
  const unique = [...new Set(ids.filter((id) => id.length > 0))].slice(0, MAX_CART_IDS);
  if (unique.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: unique } },
    include: productInclude,
  });
  const byId = new Map(products.map((product) => [product.id, serializeProductSummary(product)]));
  return unique.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}
