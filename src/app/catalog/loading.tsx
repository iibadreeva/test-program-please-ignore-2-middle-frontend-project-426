import { PulseCardGrid } from "@/components/pulse-card-grid";

export default function CatalogLoading() {
  return (
    <div data-testid="catalog-loading" className="animate-pulse">
      <div className="bg-surface-2 h-9 w-40" />
      <div className="bg-surface-2 mt-2 h-4 w-28" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr] lg:items-start">
        <div className="border-border bg-surface h-80 border" />
        <PulseCardGrid count={6} />
      </div>
    </div>
  );
}
