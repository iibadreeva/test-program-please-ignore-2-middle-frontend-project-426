import { Suspense } from "react";
import { CatalogFilters } from "@/features/catalog/catalog-filters";
import { ProductCard } from "@/features/catalog/product-card";
import { CatalogPagination } from "@/features/catalog/catalog-pagination";
import {
  listBrands,
  listCategories,
  listProducts,
  type ProductSort,
} from "@/server/services/catalog";
import { listProductsQuerySchema } from "@/shared/api-contract";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Drop repeated params so `?page=1&page=2` cannot slip past the schema. */
function firstValues(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(sp)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = firstValues(await searchParams);
  const parsed = listProductsQuerySchema.safeParse(raw);
  // Unparseable params fall back to the schema defaults instead of erroring out.
  const query = parsed.success ? parsed.data : listProductsQuerySchema.parse({});

  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let brands: Awaited<ReturnType<typeof listBrands>> = [];
  let result: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    meta: { page: 1, perPage: query.perPage, total: 0, totalPages: 1 },
  };
  let dbUnavailable = false;

  try {
    [categories, brands, result] = await Promise.all([
      listCategories(),
      listBrands(),
      listProducts({ ...query, sort: query.sort as ProductSort }),
    ]);
  } catch {
    dbUnavailable = true;
  }

  return (
    <div data-testid="catalog-page">
      <h1 className="font-display text-3xl font-semibold">Каталог</h1>
      {dbUnavailable ? (
        <p
          className="border-warn/40 bg-surface text-warn mt-4 border p-4 text-sm"
          data-testid="catalog-db-error"
        >
          База данных недоступна. Поднимите Postgres (`docker compose up -d db`) или укажите
          `DATABASE_URL` в `.env`, затем выполните `npm run db:deploy` и `npm run db:seed`.
        </p>
      ) : (
        <p className="text-muted mt-1 text-sm">
          Найдено:{" "}
          <span className="text-text font-mono" data-testid="catalog-total">
            {result.meta.total}
          </span>
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <Suspense
          fallback={
            <div className="border-border bg-surface text-muted border p-4">Фильтры…</div>
          }
        >
          <CatalogFilters categories={categories} brands={brands} />
        </Suspense>

        <div>
          {result.items.length === 0 ? (
            <p
              className="border-border bg-surface text-muted border p-8"
              data-testid="catalog-empty"
            >
              {dbUnavailable
                ? "Каталог появится после подключения базы."
                : "Под выбранные фильтры ничего не подошло. Измените условия или сбросьте фильтры."}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="catalog-list">
              {result.items.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}

          <Suspense fallback={null}>
            <CatalogPagination page={result.meta.page} totalPages={result.meta.totalPages} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
