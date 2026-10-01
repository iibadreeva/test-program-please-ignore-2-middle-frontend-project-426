/** Универсальный скелетон сегмента: без «каталожной» сетки карточек. */
export default function RootLoading() {
  return (
    <div data-testid="route-loading" className="animate-pulse space-y-8" aria-busy="true">
      <div>
        <div className="bg-surface-2 h-9 w-48 max-w-full" />
        <div className="bg-surface-2 mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="border-border bg-surface space-y-4 border p-6">
        <div className="bg-surface-2 h-4 w-full" />
        <div className="bg-surface-2 h-4 w-5/6" />
        <div className="bg-surface-2 h-4 w-2/3" />
        <div className="bg-surface-2 mt-6 h-40 w-full" />
      </div>
    </div>
  );
}
