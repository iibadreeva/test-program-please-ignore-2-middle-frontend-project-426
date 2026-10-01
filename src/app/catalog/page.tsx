import { Suspense } from "react";
import { PulseCardGrid } from "@/components/pulse-card-grid";
import { CatalogFilters } from "@/features/catalog/catalog-filters";
import { ProductCard } from "@/features/catalog/product-card";
import { CatalogPagination } from "@/features/catalog/catalog-pagination";
import {
  listBrands,
  listCategories,
  listProducts,
  type ProductSort,
} from "@/server/services/catalog";
import {
  isDatabaseUnavailableError,
  reportUnexpectedError,
} from "@/server/observability/report";
import { listProductsQuerySchema } from "@/shared/api-contract";

/**
 * searchParams делают страницу dynamic per request — Full Route Cache здесь
 * почти не помогает. revalidate + layout без cookies() нужны для data-cache
 * (`unstable_cache` / теги catalog) между запросами с разными фильтрами.
 */
export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Берём только первое значение параметра: `?page=1&page=2` не проходит мимо schema. */
function firstValues(sp: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(sp)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      .filter(([, value]) => value !== undefined && value !== ""),
  );
}

function CatalogFiltersSkeleton() {
  return (
    <div
      className="border-border bg-surface text-muted border p-4"
      data-testid="catalog-filters-loading"
    >
      Фильтры…
    </div>
  );
}

function CatalogDbUnavailableNotice() {
  return (
    <p
      className="border-warn/40 bg-surface text-warn border p-4 text-sm"
      data-testid="catalog-db-error"
    >
      База данных недоступна. Поднимите Postgres (`docker compose up -d db`) или укажите
      `DATABASE_URL` в `.env`, затем выполните `npm run db:deploy` и `npm run db:seed`.
    </p>
  );
}

function CatalogGenericErrorNotice() {
  return (
    <p
      className="border-warn/40 bg-surface text-warn border p-4 text-sm"
      data-testid="catalog-error"
    >
      Не удалось загрузить каталог. Попробуйте обновить страницу.
    </p>
  );
}

function CatalogResultsSkeleton() {
  return (
    <div data-testid="catalog-results-loading" className="animate-pulse">
      <div className="bg-surface-2 mb-4 h-4 w-28" />
      <PulseCardGrid count={6} />
    </div>
  );
}

async function CatalogSidebar() {
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  let brands: Awaited<ReturnType<typeof listBrands>> = [];
  try {
    [categories, brands] = await Promise.all([listCategories(), listBrands()]);
  } catch (error) {
    reportUnexpectedError(error);
    // Полный notice только в results — здесь короткий плейсхолдер колонки.
    return (
      <div
        className="border-border bg-surface text-muted border p-4 text-sm"
        data-testid="catalog-filters-unavailable"
      >
        Фильтры недоступны
      </div>
    );
  }

  // Отдельный Suspense: useSearchParams в CatalogFilters не должен деоптить страницу.
  return (
    <Suspense fallback={<CatalogFiltersSkeleton />}>
      <CatalogFilters categories={categories} brands={brands} />
    </Suspense>
  );
}

async function CatalogResults({
  query,
}: {
  query: ReturnType<typeof listProductsQuerySchema.parse>;
}) {
  let result: Awaited<ReturnType<typeof listProducts>> = {
    items: [],
    meta: { page: 1, perPage: query.perPage, total: 0, totalPages: 1 },
  };

  try {
    result = await listProducts({ ...query, sort: query.sort as ProductSort });
  } catch (error) {
    reportUnexpectedError(error);
    // Не любая ошибка = даунтайм БД: иначе баг сервиса маскируется под «поднимите Postgres».
    if (isDatabaseUnavailableError(error)) {
      return <CatalogDbUnavailableNotice />;
    }
    return <CatalogGenericErrorNotice />;
  }

  return (
    <div>
      <p className="text-muted mb-4 text-sm">
        Найдено:{" "}
        <span className="text-text font-mono" data-testid="catalog-total">
          {result.meta.total}
        </span>
      </p>

      {result.items.length === 0 ? (
        <p
          className="border-border bg-surface text-muted border p-8"
          data-testid="catalog-empty"
        >
          Под выбранные фильтры ничего не подошло. Измените условия или сбросьте фильтры.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="catalog-list">
          {result.items.map((product, index) => (
            <li key={product.id}>
              <ProductCard product={product} priority={index < 3} prefetch={index < 3} />
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={null}>
        <CatalogPagination page={result.meta.page} totalPages={result.meta.totalPages} />
      </Suspense>
    </div>
  );
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = firstValues(await searchParams);
  const parsed = listProductsQuerySchema.safeParse(raw);
  // Невалидные params → дефолты schema, без ошибки страницы.
  const query = parsed.success ? parsed.data : listProductsQuerySchema.parse({});

  return (
    <div data-testid="catalog-page">
      <h1 className="font-display text-3xl font-semibold">Каталог</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <Suspense fallback={<CatalogFiltersSkeleton />}>
          <CatalogSidebar />
        </Suspense>

        <Suspense fallback={<CatalogResultsSkeleton />}>
          <CatalogResults query={query} />
        </Suspense>
      </div>
    </div>
  );
}
