"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildCatalogHref, parseFiltersFromParams } from "@/features/catalog/filters-state";

type Props = {
  page: number;
  totalPages: number;
};

const linkClass = "border-border hover:border-accent border px-3 py-1.5 text-sm transition";
const disabledClass = "border-border/40 text-muted border px-3 py-1.5 text-sm";

export function CatalogPagination({ page, totalPages }: Props) {
  const searchParams = useSearchParams();
  const filters = parseFiltersFromParams(searchParams);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-3"
      data-testid="catalog-pagination"
      aria-label="Пагинация"
    >
      {/* The edge controls stay in the DOM but stop being links, so there is no
          way to navigate to a page outside the existing range. */}
      {hasPrev ? (
        <Link
          href={buildCatalogHref(filters, page - 1)}
          className={linkClass}
          data-testid="catalog-page-prev"
          rel="prev"
        >
          Назад
        </Link>
      ) : (
        <button type="button" className={disabledClass} data-testid="catalog-page-prev" disabled>
          Назад
        </button>
      )}

      <span className="text-muted font-mono text-sm" data-testid="catalog-page-current">
        {page} / {totalPages}
      </span>

      {hasNext ? (
        <Link
          href={buildCatalogHref(filters, page + 1)}
          className={linkClass}
          data-testid="catalog-page-next"
          rel="next"
        >
          Вперёд
        </Link>
      ) : (
        <button type="button" className={disabledClass} data-testid="catalog-page-next" disabled>
          Вперёд
        </button>
      )}
    </nav>
  );
}
