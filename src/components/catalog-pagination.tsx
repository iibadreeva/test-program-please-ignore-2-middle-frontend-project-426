import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
};

export function CatalogPagination({ page, totalPages, searchParams }: Props) {
  function hrefFor(target: number) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "page") params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/catalog?${qs}` : "/catalog";
  }

  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" data-testid="catalog-pagination" aria-label="Пагинация">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="border border-border px-3 py-1.5 text-sm hover:border-accent"
          data-testid="pagination-prev"
        >
          Назад
        </Link>
      ) : (
        <span className="border border-border/40 px-3 py-1.5 text-sm text-muted">Назад</span>
      )}
      <span className="font-mono text-sm text-muted" data-testid="pagination-info">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="border border-border px-3 py-1.5 text-sm hover:border-accent"
          data-testid="pagination-next"
        >
          Вперёд
        </Link>
      ) : (
        <span className="border border-border/40 px-3 py-1.5 text-sm text-muted">Вперёд</span>
      )}
    </nav>
  );
}
