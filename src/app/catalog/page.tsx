import { Suspense } from "react";
import { CatalogFilters } from "@/features/catalog-filters";
import { ProductCard } from "@/components/product-card";
import { CatalogPagination } from "@/components/catalog-pagination";
import {
  listBrands,
  listCategories,
  listProducts,
  type ProductSort,
} from "@/server/services/catalog";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = first(sp.category);
  const brand = first(sp.brand);
  const search = first(sp.search);
  const sort = (first(sp.sort) as ProductSort | undefined) ?? "newest";
  const page = Number(first(sp.page) ?? "1") || 1;
  const minPrice = first(sp.minPrice) ? Number(first(sp.minPrice)) : undefined;
  const maxPrice = first(sp.maxPrice) ? Number(first(sp.maxPrice)) : undefined;

  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let brands: Awaited<ReturnType<typeof listBrands>> = [];
  let result: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    meta: { page: 1, perPage: 12, total: 0, totalPages: 1 },
  };
  let dbUnavailable = false;

  try {
    [categories, brands, result] = await Promise.all([
      listCategories(),
      listBrands(),
      listProducts({ category, brand, search, sort, page, minPrice, maxPrice }),
    ]);
  } catch {
    dbUnavailable = true;
  }

  const filterParams = {
    category,
    brand,
    search,
    sort,
    minPrice: first(sp.minPrice),
    maxPrice: first(sp.maxPrice),
  };

  return (
    <div data-testid="catalog-page">
      <h1 className="font-display text-3xl font-semibold">Каталог</h1>
      {dbUnavailable ? (
        <p className="mt-4 border border-warn/40 bg-surface p-4 text-sm text-warn" data-testid="catalog-db-error">
          База данных недоступна. Поднимите Postgres (`docker compose up -d`) или укажите Neon
          `DATABASE_URL` в `.env`, затем выполните `npx prisma migrate deploy` и `npm run db:seed`.
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">
          Найдено: <span className="font-mono text-text">{result.meta.total}</span>
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense fallback={<div className="border border-border bg-surface p-4 text-muted">Фильтры…</div>}>
          <CatalogFilters categories={categories} brands={brands} />
        </Suspense>

        <div>
          {result.items.length === 0 ? (
            <p className="border border-border bg-surface p-8 text-muted" data-testid="catalog-empty">
              {dbUnavailable
                ? "Каталог появится после подключения базы."
                : "Ничего не найдено. Сбросьте фильтры или измените запрос."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="product-list">
              {result.items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}

          <CatalogPagination
            page={result.meta.page}
            totalPages={result.meta.totalPages}
            searchParams={filterParams}
          />
        </div>
      </div>
    </div>
  );
}
