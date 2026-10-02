import Link from "next/link";
import { ProductImage } from "@/features/catalog/product-image";
import { ProductPrice } from "@/features/catalog/product-price";
import { routes } from "@/shared/routes";
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
  /** Префикс test id: на главной — без catalog-* атрибутов. */
  testIdPrefix?: string;
  /** LCP: первые карточки выше fold. */
  priority?: boolean;
  /** Prefetch только для ближайших ссылок — меньше RSC-запросов на каталоге. */
  prefetch?: boolean;
};

export function ProductCard({
  product,
  testIdPrefix = "catalog-item",
  priority = false,
  prefetch = true,
}: Props) {
  const href = routes.product(product.slug);

  return (
    <article
      className="border-border bg-surface hover:border-accent flex h-full min-w-0 flex-col border transition"
      data-testid={testIdPrefix}
    >
      <Link href={href} prefetch={prefetch} tabIndex={-1} aria-hidden className="block">
        <ProductImage
          src={product.imageUrl}
          alt={product.title}
          className="aspect-[4/3] w-full"
          testId={`${testIdPrefix}-image`}
          priority={priority}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-muted text-xs tracking-wide break-words uppercase">
          {product.brand.name} · {product.category.name}
        </p>

        <h2 className="font-display text-base leading-snug font-medium break-words">
          <Link
            href={href}
            prefetch={prefetch}
            className="hover:text-accent"
            data-testid={`${testIdPrefix}-name`}
          >
            {product.title}
          </Link>
        </h2>

        <p
          className="text-muted line-clamp-2 text-sm"
          data-testid={`${testIdPrefix}-description`}
        >
          {product.description}
        </p>

        <ProductPrice
          price={product.price}
          oldPrice={product.oldPrice}
          priceTestId={`${testIdPrefix}-price`}
          className="mt-auto pt-2"
        />

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
