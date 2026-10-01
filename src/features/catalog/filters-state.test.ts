import { describe, expect, it } from "vitest";
import {
  buildCatalogHref,
  buildSearchParams,
  EMPTY_FILTERS,
  isDefaultFilters,
  parseFiltersFromParams,
  parsePageFromParams,
} from "@/features/catalog/filters-state";

const params = (qs: string) => new URLSearchParams(qs);

describe("parseFiltersFromParams", () => {
  it("restores every control from the address", () => {
    expect(
      parseFiltersFromParams(
        params(
          "search=rtx&category=graphics-cards&brand=nvidia&minPrice=1000&maxPrice=90000&available=true&sort=price_asc",
        ),
      ),
    ).toEqual({
      search: "rtx",
      category: "graphics-cards",
      brand: "nvidia",
      priceMin: "1000",
      priceMax: "90000",
      availableOnly: true,
      sort: "price_asc",
    });
  });

  it("falls back to the empty state for a bare address", () => {
    expect(parseFiltersFromParams(params(""))).toEqual(EMPTY_FILTERS);
  });

  it("treats anything but true as availability off", () => {
    expect(parseFiltersFromParams(params("available=false")).availableOnly).toBe(false);
    expect(parseFiltersFromParams(params("available=1")).availableOnly).toBe(false);
  });
});

describe("parsePageFromParams", () => {
  it("reads a positive page", () => {
    expect(parsePageFromParams(params("page=4"))).toBe(4);
  });

  it("falls back to the first page for missing or broken values", () => {
    expect(parsePageFromParams(params(""))).toBe(1);
    expect(parsePageFromParams(params("page=0"))).toBe(1);
    expect(parsePageFromParams(params("page=-2"))).toBe(1);
    expect(parsePageFromParams(params("page=abc"))).toBe(1);
  });
});

describe("buildSearchParams", () => {
  it("omits empty controls", () => {
    expect(buildSearchParams(EMPTY_FILTERS).toString()).toBe("");
  });

  it("drops the page when a filter changes", () => {
    const current = parseFiltersFromParams(params("category=cooling&page=5"));
    expect(buildSearchParams({ ...current, category: "memory" }).has("page")).toBe(false);
  });

  it("keeps the page only past the first one", () => {
    expect(buildSearchParams(EMPTY_FILTERS, 1).has("page")).toBe(false);
    expect(buildSearchParams(EMPTY_FILTERS, 3).get("page")).toBe("3");
  });

  it("omits the default sort to keep the address short", () => {
    expect(buildSearchParams({ ...EMPTY_FILTERS, sort: "newest" }).has("sort")).toBe(false);
    expect(buildSearchParams({ ...EMPTY_FILTERS, sort: "price_asc" }).get("sort")).toBe("price_asc");
  });

  it("trims the search string", () => {
    expect(buildSearchParams({ ...EMPTY_FILTERS, search: "  rtx  " }).get("search")).toBe("rtx");
    expect(buildSearchParams({ ...EMPTY_FILTERS, search: "   " }).has("search")).toBe(false);
  });

  it("keeps only digits in the price bounds", () => {
    expect(buildSearchParams({ ...EMPTY_FILTERS, priceMin: "-5" }).get("minPrice")).toBe("5");
    expect(buildSearchParams({ ...EMPTY_FILTERS, priceMin: "1e5" }).get("minPrice")).toBe("15");
    expect(buildSearchParams({ ...EMPTY_FILTERS, priceMax: "007" }).get("maxPrice")).toBe("7");
    expect(buildSearchParams({ ...EMPTY_FILTERS, priceMax: "abc" }).has("maxPrice")).toBe(false);
  });

  it("writes availability only when it is on", () => {
    expect(buildSearchParams({ ...EMPTY_FILTERS, availableOnly: false }).has("available")).toBe(
      false,
    );
    expect(buildSearchParams({ ...EMPTY_FILTERS, availableOnly: true }).get("available")).toBe(
      "true",
    );
  });

  it("round-trips a filter state through the address", () => {
    const original = {
      search: "ryzen",
      category: "processors",
      brand: "amd",
      priceMin: "20000",
      priceMax: "45000",
      availableOnly: true,
      sort: "price_desc",
    };
    expect(parseFiltersFromParams(buildSearchParams(original))).toEqual(original);
  });
});

describe("buildCatalogHref", () => {
  it("returns a bare path when nothing is selected", () => {
    expect(buildCatalogHref(EMPTY_FILTERS)).toBe("/catalog");
  });

  it("preserves filters while paging", () => {
    const filters = parseFiltersFromParams(params("category=memory&available=true"));
    expect(buildCatalogHref(filters, 2)).toBe("/catalog?category=memory&available=true&page=2");
  });
});

describe("isDefaultFilters", () => {
  it("recognises the reset state", () => {
    expect(isDefaultFilters(EMPTY_FILTERS)).toBe(true);
    expect(isDefaultFilters({ ...EMPTY_FILTERS, availableOnly: true })).toBe(false);
  });
});
