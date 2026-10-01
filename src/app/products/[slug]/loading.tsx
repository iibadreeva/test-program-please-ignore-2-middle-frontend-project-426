export default function ProductLoading() {
  return (
    <div data-testid="product-loading" className="grid animate-pulse gap-8 lg:grid-cols-2">
      <div className="border-border bg-surface-2 aspect-[4/3] w-full border" />
      <div className="space-y-4">
        <div className="bg-surface-2 h-4 w-40" />
        <div className="bg-surface-2 h-9 w-3/4" />
        <div className="bg-surface-2 h-8 w-28" />
        <div className="bg-surface-2 h-4 w-48" />
        <div className="bg-surface-2 mt-6 h-20 w-full" />
        <div className="bg-surface-2 mt-8 h-11 w-40" />
      </div>
    </div>
  );
}
