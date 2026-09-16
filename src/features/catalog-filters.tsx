"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export type FilterOption = { slug: string; name: string };

type Props = {
  categories: FilterOption[];
  brands: FilterOption[];
};

export function CatalogFilters({ categories, brands }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      className="space-y-4 border border-border bg-surface p-4"
      data-testid="catalog-filters"
      onSubmit={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <label className="block text-sm">
        <span className="text-muted">Поиск</span>
        <input
          type="search"
          name="search"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => update("search", e.target.value)}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          placeholder="Название товара"
          data-testid="filter-search"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Категория</span>
        <select
          name="category"
          value={searchParams.get("category") ?? ""}
          onChange={(e) => update("category", e.target.value)}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="filter-category"
        >
          <option value="">Все</option>
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
          value={searchParams.get("brand") ?? ""}
          onChange={(e) => update("brand", e.target.value)}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="filter-brand"
        >
          <option value="">Все</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm">
          <span className="text-muted">Цена от (₽)</span>
          <input
            type="number"
            min={0}
            defaultValue={
              searchParams.get("minPrice")
                ? String(Number(searchParams.get("minPrice")) / 100)
                : ""
            }
            onBlur={(e) => {
              const rub = e.target.value ? Math.round(Number(e.target.value) * 100) : "";
              update("minPrice", rub === "" ? "" : String(rub));
            }}
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-text"
            data-testid="filter-min-price"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Цена до (₽)</span>
          <input
            type="number"
            min={0}
            defaultValue={
              searchParams.get("maxPrice")
                ? String(Number(searchParams.get("maxPrice")) / 100)
                : ""
            }
            onBlur={(e) => {
              const rub = e.target.value ? Math.round(Number(e.target.value) * 100) : "";
              update("maxPrice", rub === "" ? "" : String(rub));
            }}
            className="mt-1 w-full border border-border bg-bg px-3 py-2 font-mono text-text"
            data-testid="filter-max-price"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted">Сортировка</span>
        <select
          name="sort"
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => update("sort", e.target.value)}
          className="mt-1 w-full border border-border bg-bg px-3 py-2 text-text"
          data-testid="filter-sort"
        >
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
          <option value="rating_desc">Рейтинг</option>
        </select>
      </label>
    </form>
  );
}
