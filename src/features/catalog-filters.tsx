"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  buildSearchParams,
  EMPTY_FILTERS,
  parseFiltersFromParams,
  type CatalogFiltersState,
} from "@/features/catalog/filters-state";

export type FilterOption = { slug: string; name: string };

type Props = {
  categories: FilterOption[];
  brands: FilterOption[];
};

/** Typing must not fire a request per keystroke. */
const TEXT_INPUT_DEBOUNCE_MS = 300;

export function CatalogFilters({ categories, brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlKey = searchParams.toString();
  // Controls render from local state, so they react within the same click or
  // keystroke while the URL stays the source of truth for the request.
  const [filters, setFilters] = useState<CatalogFiltersState>(() =>
    parseFiltersFromParams(searchParams),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Query string of our own last navigation: adopting it back would overwrite
  // characters typed while the navigation was in flight.
  const selfPushedRef = useRef<string | null>(urlKey);

  const cancelPendingCommit = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Adopt the URL on back/forward and on reset; a queued commit is dropped so a
  // stale keystroke cannot navigate away from the state the user just landed on.
  useEffect(() => {
    if (selfPushedRef.current === urlKey) {
      selfPushedRef.current = null;
      return;
    }
    cancelPendingCommit();
    setFilters(parseFiltersFromParams(new URLSearchParams(urlKey)));
  }, [urlKey, cancelPendingCommit]);

  useEffect(() => cancelPendingCommit, [cancelPendingCommit]);

  const commit = useCallback(
    (next: CatalogFiltersState) => {
      // Any filter change goes back to the first page.
      const qs = buildSearchParams(next).toString();
      if (qs === urlKey) return;
      selfPushedRef.current = qs;
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [pathname, router, urlKey],
  );

  /** Selects and checkboxes commit at once; text inputs wait out the debounce. */
  function update(patch: Partial<CatalogFiltersState>, debounce = false) {
    cancelPendingCommit();
    const next = { ...filters, ...patch };
    setFilters(next);

    if (!debounce) {
      commit(next);
      return;
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      commit(next);
    }, TEXT_INPUT_DEBOUNCE_MS);
  }

  function reset() {
    cancelPendingCommit();
    setFilters(EMPTY_FILTERS);
    selfPushedRef.current = "";
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <form
      className="border-border bg-surface space-y-4 border p-4 lg:sticky lg:top-20"
      data-testid="catalog-filters"
      onSubmit={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <label className="block text-sm">
        <span className="text-muted">Поиск</span>
        <input
          type="search"
          name="search"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value }, true)}
          className="border-border bg-bg text-text mt-1 w-full border px-3 py-2"
          placeholder="Название товара"
          data-testid="filter-search"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Категория</span>
        <select
          name="category"
          value={filters.category}
          onChange={(e) => update({ category: e.target.value })}
          className="border-border bg-bg text-text mt-1 w-full border px-3 py-2"
          data-testid="filter-category"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="text-muted">Бренд</span>
        <select
          name="brand"
          value={filters.brand}
          onChange={(e) => update({ brand: e.target.value })}
          className="border-border bg-bg text-text mt-1 w-full border px-3 py-2"
          data-testid="filter-brand"
        >
          <option value="">Все бренды</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="grid grid-cols-2 gap-2 border-0 p-0">
        <legend className="text-muted text-sm">Цена, ₽</legend>
        <label className="block text-sm">
          <span className="text-muted">от</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={filters.priceMin}
            onChange={(e) => update({ priceMin: e.target.value }, true)}
            className="border-border bg-bg text-text mt-1 w-full border px-3 py-2 font-mono"
            data-testid="filter-price-min"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">до</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={filters.priceMax}
            onChange={(e) => update({ priceMax: e.target.value }, true)}
            className="border-border bg-bg text-text mt-1 w-full border px-3 py-2 font-mono"
            data-testid="filter-price-max"
          />
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="available"
          checked={filters.availableOnly}
          onChange={(e) => update({ availableOnly: e.target.checked })}
          className="accent-accent size-4"
          data-testid="filter-available"
        />
        <span className="text-text">Только в наличии</span>
      </label>

      <label className="block text-sm">
        <span className="text-muted">Сортировка</span>
        <select
          name="sort"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="border-border bg-bg text-text mt-1 w-full border px-3 py-2"
          data-testid="filter-sort"
        >
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="rating_desc">Рейтинг</option>
        </select>
      </label>

      <button
        type="button"
        onClick={reset}
        className="border-border hover:border-accent w-full border px-3 py-2 text-sm transition"
        data-testid="filter-reset"
      >
        Сбросить фильтры
      </button>
    </form>
  );
}
