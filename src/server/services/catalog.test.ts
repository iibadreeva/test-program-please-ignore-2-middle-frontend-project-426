import { describe, expect, it } from "vitest";
import {
  buildProductOrderBy,
  buildProductWhere,
  normalizePagination,
} from "@/server/services/catalog";

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

  it("keeps unavailable products unless the availability filter is on", () => {
    expect(buildProductWhere({}).stock).toBeUndefined();
    expect(buildProductWhere({ available: false }).stock).toBeUndefined();
    expect(buildProductWhere({ available: true }).stock).toEqual({ gt: 0 });
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
