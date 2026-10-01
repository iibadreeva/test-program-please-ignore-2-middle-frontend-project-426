import { formatMoney } from "@/shared/money";
import { cn } from "@/shared/cn";

type Props = {
  price: string;
  oldPrice?: string;
  size?: "sm" | "md" | "lg";
  priceTestId?: string;
  /** Если не задан — `${priceTestId}-old`, когда есть priceTestId. */
  oldPriceTestId?: string;
  className?: string;
};

const sizeClasses = {
  sm: {
    wrap: "gap-2",
    price: "font-mono text-accent",
    old: "font-mono text-sm text-muted line-through",
  },
  md: {
    wrap: "gap-2",
    price: "font-mono text-lg text-accent",
    old: "font-mono text-sm text-muted line-through",
  },
  lg: {
    wrap: "gap-3",
    price: "font-mono text-2xl text-accent",
    old: "font-mono text-muted line-through",
  },
} as const;

/** Актуальная цена и опциональная зачёркнутая бывшая. */
export function ProductPrice({
  price,
  oldPrice,
  size = "md",
  priceTestId,
  oldPriceTestId,
  className,
}: Props) {
  const styles = sizeClasses[size];
  const resolvedOldTestId =
    oldPriceTestId ?? (priceTestId ? `${priceTestId}-old` : undefined);

  return (
    <div className={cn("flex items-baseline", styles.wrap, className)}>
      <span className={styles.price} data-testid={priceTestId}>
        {formatMoney(price)}
      </span>
      {oldPrice ? (
        <span className={styles.old} data-testid={resolvedOldTestId}>
          {formatMoney(oldPrice)}
        </span>
      ) : null}
    </div>
  );
}
