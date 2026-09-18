import Link from "next/link";
import { formatPrice } from "@/shared/format";
import type { ProductSummary } from "@/shared/api-contract";

export type ProductCardData = Pick<
  ProductSummary,
  "id" | "slug" | "title" | "price" | "oldPrice" | "imageUrl" | "stock" | "rating"
> & {
  brand: { name: string };
  category: { name: string };
};

type Props = {
  product: ProductCardData;
};

export function ProductCard({ product }: Props) {
  return (
    <article
      className="flex flex-col border border-border bg-surface transition hover:border-accent"
      data-testid="product-card"
    >
      <Link href={`/products/${product.slug}`} className="block" data-testid="product-card-link">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrl}
          alt={product.title}
          className="aspect-[4/3] w-full object-cover bg-surface-2"
          data-testid="product-card-image"
        />
        <div className="space-y-2 p-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            {product.brand.name} · {product.category.name}
          </p>
          <h2 className="font-display text-base font-medium leading-snug text-text" data-testid="product-card-title">
            {product.title}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg text-accent" data-testid="product-card-price">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice ? (
              <span className="font-mono text-sm text-muted line-through">
                {formatPrice(product.oldPrice)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            ★ {product.rating.toFixed(1)}
            {product.stock <= 0 ? " · нет в наличии" : product.stock < 5 ? " · мало" : null}
          </p>
        </div>
      </Link>
    </article>
  );
}
