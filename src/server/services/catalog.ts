import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";

export type ProductSort = "price_asc" | "price_desc" | "rating_desc" | "newest";

export type ListProductsInput = {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
};

const productInclude = {
  category: true,
  brand: true,
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function serializeProduct(product: ProductWithRelations) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    priceCents: product.priceCents,
    oldPriceCents: product.oldPriceCents,
    imageUrl: product.imageUrl,
    stock: product.stock,
    rating: product.rating,
    specs: product.specs,
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

export function serializeProductSummary(product: ProductWithRelations) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    priceCents: product.priceCents,
    oldPriceCents: product.oldPriceCents,
    imageUrl: product.imageUrl,
    stock: product.stock,
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
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(48, Math.max(1, input.perPage ?? 12));
  const sort = input.sort ?? "newest";

  const where: Prisma.ProductWhereInput = {};

  if (input.category) {
    where.category = { slug: input.category };
  }
  if (input.brand) {
    where.brand = { slug: input.brand };
  }
  if (input.minPrice != null || input.maxPrice != null) {
    where.priceCents = {};
    if (input.minPrice != null) where.priceCents.gte = input.minPrice;
    if (input.maxPrice != null) where.priceCents.lte = input.maxPrice;
  }
  if (input.search?.trim()) {
    const q = input.search.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { priceCents: "asc" }
      : sort === "price_desc"
        ? { priceCents: "desc" }
        : sort === "rating_desc"
          ? { rating: "desc" }
          : { createdAt: "desc" };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return {
    items: items.map(serializeProductSummary),
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
  return product ? serializeProduct(product) : null;
}
