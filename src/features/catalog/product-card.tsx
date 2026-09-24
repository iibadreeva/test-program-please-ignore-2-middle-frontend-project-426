import Link from "next/link";
import { ProductImage } from "@/features/catalog/product-image";
import { formatMoney } from "@/shared/money";
import type { ProductSummary } from "@/shared/api-contract";

export type ProductCardData = Pick<
  ProductSummary,
  "id" | "slug" | "title" | "description" | "price" | "oldPrice" | "imageUrl" | "available" | "rating"
> & {
  brand: { name: string };
  category: { name: string };
};

type Props = {
  product: ProductCardData;
  /** Lets the home page reuse the card without exposing catalog test ids. */
  testIdPrefix?: string;
};

export function ProductCard({ product, testIdPrefix = "catalog-item" }: Props) {
  const href = `/products/${product.slug}`;

  return (
    <article
      className="border-border bg-surface hover:border-accent flex h-full flex-col border transition"
      data-testid={testIdPrefix}
    >
      <Link href={href} tabIndex={-1} aria-hidden className="block">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          className="aspect-[4/3] w-full"
          testId={`${testIdPrefix}-image`}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-muted text-xs tracking-wide uppercase">
          {product.brand.name} · {product.category.name}
        </p>

        <h2 className="font-display text-base leading-snug font-medium">
          <Link href={href} className="hover:text-accent" data-testid={`${testIdPrefix}-name`}>
            {product.title}
          </Link>
        </h2>

        <p
          className="text-muted line-clamp-2 text-sm"
          data-testid={`${testIdPrefix}-description`}
        >
          {product.description}
        </p>

        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-accent font-mono text-lg" data-testid={`${testIdPrefix}-price`}>
            {formatMoney(product.price)}
          </span>
          {product.oldPrice ? (
            <span className="text-muted font-mono text-sm line-through">
              {formatMoney(product.oldPrice)}
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span
            className={product.available ? "text-accent" : "text-warn"}
            data-testid={`${testIdPrefix}-availability`}
            data-available={product.available ? "true" : "false"}
          >
            {product.available ? "В наличии" : "Нет в наличии"}
          </span>
          <span className="text-muted">★ {product.rating.toFixed(1)}</span>
        </div>
      </div>
    </article>
  );
}
