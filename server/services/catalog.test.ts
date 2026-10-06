import { describe, expect, it } from "vitest";
import {
  buildProductOrderBy,
  buildProductWhere,
  catalogProductsCacheKey,
  listProductsInputFromCacheKey,
  normalizePagination,
  shouldCacheProductList,
} from "@server/services/catalog";

describe("buildProductWhere", () => {
  it("returns an empty filter without input", () => {
    expect(buildProductWhere({})).toEqual({});
  });

  it("filters by category slug", () => {
    expect(buildProductWhere({ category: "graphics-cards" })).toEqual({
      category: { slug: "graphics-cards" },
    });
  });

  it("supports an open-ended price range", () => {
    expect(buildProductWhere({ minPrice: 1000 }).price).toEqual({ gte: 1000 });
    expect(buildProductWhere({ maxPrice: 5000 }).price).toEqual({ lte: 5000 });
    expect(buildProductWhere({ minPrice: 1000, maxPrice: 5000 }).price).toEqual({
      gte: 1000,
      lte: 5000,
    });
  });

  it("фильтрует наличие по флагу available", () => {
    expect(buildProductWhere({}).stock).toBeUndefined();
    expect(buildProductWhere({ available: true }).stock).toEqual({ gt: 0 });
    expect(buildProductWhere({ available: false }).stock).toEqual({ lte: 0 });
  });

  it("searches by title only, case-insensitively", () => {
    expect(buildProductWhere({ search: "RTX" }).title).toEqual({
      contains: "RTX",
      mode: "insensitive",
    });
  });

  it("ignores a blank search string", () => {
    expect(buildProductWhere({ search: "   " }).title).toBeUndefined();
  });

  it("combines all four axes at once", () => {
    expect(
      buildProductWhere({
        category: "cooling",
        minPrice: 500,
        maxPrice: 9000,
        available: true,
        search: "deepcool",
      }),
    ).toEqual({
      category: { slug: "cooling" },
      price: { gte: 500, lte: 9000 },
      stock: { gt: 0 },
      title: { contains: "deepcool", mode: "insensitive" },
    });
  });
});

describe("buildProductOrderBy", () => {
  it("maps every sort option to its column", () => {
    expect(buildProductOrderBy("price_asc")[0]).toEqual({ price: "asc" });
    expect(buildProductOrderBy("price_desc")[0]).toEqual({ price: "desc" });
    expect(buildProductOrderBy("rating_desc")[0]).toEqual({ rating: "desc" });
    expect(buildProductOrderBy("newest")[0]).toEqual({ createdAt: "desc" });
    expect(buildProductOrderBy()[0]).toEqual({ createdAt: "desc" });
  });

  it("always appends an id tiebreaker so paging is stable", () => {
    for (const sort of ["price_asc", "price_desc", "rating_desc", "newest"] as const) {
      const orderBy = buildProductOrderBy(sort);
      expect(orderBy).toHaveLength(2);
      expect(orderBy[1]).toEqual({ id: "asc" });
    }
  });
});

describe("catalogProductsCacheKey", () => {
  it("даёт одинаковый ключ при разном порядке полей во входном объекте", () => {
    const a = catalogProductsCacheKey({
      page: 2,
      category: "gpu",
      sort: "price_asc",
      brand: "nvidia",
    });
    const b = catalogProductsCacheKey({
      brand: "nvidia",
      sort: "price_asc",
      category: "gpu",
      page: 2,
    });
    expect(a).toBe(b);
  });

  it("различает разные фильтры", () => {
    expect(catalogProductsCacheKey({ page: 1 })).not.toBe(catalogProductsCacheKey({ page: 2 }));
    expect(catalogProductsCacheKey({ category: "a" })).not.toBe(
      catalogProductsCacheKey({ category: "b" }),
    );
  });

  it("roundtrip ключа сохраняет набор полей", () => {
    const input = {
      page: 2,
      category: "gpu",
      sort: "price_asc" as const,
      brand: "nvidia",
      minPrice: 100,
      available: true,
    };
    const key = catalogProductsCacheKey(input);
    expect(catalogProductsCacheKey(listProductsInputFromCacheKey(key))).toBe(key);
  });

  it("отклоняет битый JSON и невалидный payload", () => {
    expect(() => listProductsInputFromCacheKey("{")).toThrow(/кэша каталога/i);
    expect(() => listProductsInputFromCacheKey('"oops"')).toThrow(/кэша каталога/i);
    expect(() =>
      listProductsInputFromCacheKey(JSON.stringify({ sort: "title_asc", page: 1 })),
    ).toThrow(/кэша каталога/i);
  });

  it("отклоняет невалидный sort при сборке ключа, до записи в кэш", () => {
    expect(() =>
      catalogProductsCacheKey({
        sort: "title_asc" as "price_asc",
        page: 1,
      }),
    ).toThrow(/кэша каталога/i);
  });

  it("не включает search в ключ: blank → null, непустой search запрещён в Data Cache", () => {
    expect(JSON.parse(catalogProductsCacheKey({ search: "   " })).search).toBeNull();
    expect(JSON.parse(catalogProductsCacheKey({ search: "" })).search).toBeNull();
    expect(() => catalogProductsCacheKey({ search: "rtx" })).toThrow(/search/i);
  });
});

describe("shouldCacheProductList", () => {
  it("кэширует только списки без текстового поиска", () => {
    expect(shouldCacheProductList({})).toBe(true);
    expect(shouldCacheProductList({ category: "gpu", page: 2 })).toBe(true);
    expect(shouldCacheProductList({ search: "   " })).toBe(true);
    expect(shouldCacheProductList({ search: "rtx" })).toBe(false);
    expect(shouldCacheProductList({ search: " a ", category: "gpu" })).toBe(false);
  });
});

describe("normalizePagination", () => {
  it("computes the page count from the total", () => {
    expect(normalizePagination({ total: 94, perPage: 12 })).toEqual({
      page: 1,
      perPage: 12,
      total: 94,
      totalPages: 8,
    });
  });

  it("reports a single page for an empty result", () => {
    expect(normalizePagination({ total: 0 })).toMatchObject({ page: 1, totalPages: 1 });
  });

  it("clamps a page beyond the range to the last one", () => {
    expect(normalizePagination({ page: 999, perPage: 10, total: 25 }).page).toBe(3);
  });

  it("clamps a non-positive page to the first one", () => {
    expect(normalizePagination({ page: 0, total: 25 }).page).toBe(1);
    expect(normalizePagination({ page: -5, total: 25 }).page).toBe(1);
  });

  it("caps perPage so a client cannot ask for the whole catalog", () => {
    expect(normalizePagination({ perPage: 1000, total: 94 }).perPage).toBe(48);
    expect(normalizePagination({ perPage: 0, total: 94 }).perPage).toBe(1);
  });
});
