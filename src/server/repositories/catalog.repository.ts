import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { productInclude } from "@/server/db/includes/product";

/** Тонкий доступ к Prisma: фильтры/сериализация — в services/catalog. */

export async function findCategoriesOrdered() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function findBrandsOrdered() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } });
}

export async function countProducts(where: Prisma.ProductWhereInput) {
  return prisma.product.count({ where });
}

export async function findProductsPage(input: {
  where: Prisma.ProductWhereInput;
  orderBy: Prisma.ProductOrderByWithRelationInput[];
  skip: number;
  take: number;
}) {
  return prisma.product.findMany({
    where: input.where,
    include: productInclude,
    orderBy: input.orderBy,
    skip: input.skip,
    take: input.take,
  });
}

export async function findProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: productInclude,
  });
}

export async function findProductsByIds(ids: string[]) {
  return prisma.product.findMany({
    where: { id: { in: ids } },
    include: productInclude,
  });
}
