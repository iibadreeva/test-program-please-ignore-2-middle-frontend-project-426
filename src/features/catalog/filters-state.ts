/**
 * The address bar is the source of truth for the catalog request. This module is
 * the only place that translates between it and the filter controls, so the
 * filters panel and the pagination links cannot drift apart.
 */

export type CatalogFiltersState = {
  search: string;
  category: string;
  brand: string;
  priceMin: string;
  priceMax: string;
  availableOnly: boolean;
  sort: string;
};

export const DEFAULT_SORT = "newest";

export const EMPTY_FILTERS: CatalogFiltersState = {
  search: "",
  category: "",
  brand: "",
  priceMin: "",
  priceMax: "",
  availableOnly: false,
  sort: DEFAULT_SORT,
};

type ReadableParams = Pick<URLSearchParams, "get">;

export function parseFiltersFromParams(params: ReadableParams): CatalogFiltersState {
  return {
    search: params.get("search") ?? "",
    category: params.get("category") ?? "",
    brand: params.get("brand") ?? "",
    priceMin: params.get("minPrice") ?? "",
    priceMax: params.get("maxPrice") ?? "",
    availableOnly: params.get("available") === "true",
    sort: params.get("sort") ?? DEFAULT_SORT,
  };
}

export function parsePageFromParams(params: ReadableParams): number {
  const page = Number(params.get("page"));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Keeps only digits: the price inputs must not push `1e5` or `-5` into the URL. */
function normalizePrice(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits;
}

/**
 * Builds the query string for a filter state. Page 1 is omitted so the canonical
 * URL of a fresh filter change stays clean.
 */
export function buildSearchParams(state: CatalogFiltersState, page = 1): URLSearchParams {
  const params = new URLSearchParams();

  const search = state.search.trim();
  if (search) params.set("search", search);
  if (state.category) params.set("category", state.category);
  if (state.brand) params.set("brand", state.brand);

  const priceMin = normalizePrice(state.priceMin);
  const priceMax = normalizePrice(state.priceMax);
  if (priceMin) params.set("minPrice", priceMin);
  if (priceMax) params.set("maxPrice", priceMax);

  if (state.availableOnly) params.set("available", "true");
  if (state.sort && state.sort !== DEFAULT_SORT) params.set("sort", state.sort);
  if (page > 1) params.set("page", String(page));

  return params;
}

export function buildCatalogHref(state: CatalogFiltersState, page = 1): string {
  const qs = buildSearchParams(state, page).toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function isDefaultFilters(state: CatalogFiltersState): boolean {
  return buildSearchParams(state).toString() === "";
}
