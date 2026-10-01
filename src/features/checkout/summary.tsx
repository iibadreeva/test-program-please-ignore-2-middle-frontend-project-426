import { formatMoney, fromMoney } from "@/shared/money";
import type { MergedCart } from "@/features/cart/cart-items";

function SummaryLines({ merged }: { merged: MergedCart }) {
  return (
    <ul className="mt-4 space-y-3 text-sm">
      {merged.lines.map((line) => (
        <li key={line.productId} className="flex justify-between gap-3">
          <span className="text-muted">
            {line.product.title} × {line.quantity}
          </span>
          <span className="font-mono">
            {formatMoney(fromMoney(line.product.price) * line.quantity)}
          </span>
        </li>
      ))}
      {merged.broken.map((ref) => (
        <li key={ref.productId} className="text-danger flex justify-between gap-3">
          <span>
            Недоступен ({ref.productId.slice(-8)}) × {ref.quantity}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CheckoutSummary({
  merged,
  refsCount,
  pending,
}: {
  merged: MergedCart;
  refsCount: number;
  pending: boolean;
}) {
  return (
    <aside className="border-border bg-surface h-fit border p-4" data-testid="checkout-summary">
      <h2 className="font-display text-lg font-medium">Ваш заказ</h2>
      <SummaryLines merged={merged} />
      <p className="border-border text-accent mt-4 flex justify-between border-t pt-4 font-mono text-lg">
        <span>Итого</span>
        <span data-testid="checkout-preview-total">{formatMoney(merged.total)}</span>
      </p>
      <button
        type="submit"
        disabled={pending || refsCount === 0}
        className="bg-accent text-bg hover:bg-accent-dim mt-4 w-full px-5 py-2.5 font-medium disabled:opacity-40"
        data-testid="checkout-submit"
      >
        {pending ? "Оформляем…" : "Подтвердить заказ"}
      </button>
    </aside>
  );
}
