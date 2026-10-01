import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { ProductImage } from "@/features/catalog/product-image";
import { ProductPrice } from "@/features/catalog/product-price";
import { routes } from "@/shared/routes";
import { getProductBySlug } from "@/server/services/catalog";

/** Карточка товара: ISR; slug рендерится по запросу и кэшируется. */
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const specs =
    product.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
      ? Object.entries(product.specs as Record<string, unknown>)
      : [];

  return (
    <article data-testid="product-page" className="grid gap-8 lg:grid-cols-2">
      <ProductImage
        src={product.imageUrl}
        alt={product.title}
        className="aspect-[4/3] w-full border border-border"
        testId="product-image"
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
      />

      <div>
        <p className="text-sm text-muted">
          <Link href={routes.catalogCategory(product.category.slug)} className="hover:text-accent">
            {product.category.name}
          </Link>
          {" · "}
          {product.brand.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold" data-testid="product-name">
          {product.title}
        </h1>
        <ProductPrice
          price={product.price}
          oldPrice={product.oldPrice}
          size="lg"
          priceTestId="product-price"
          className="mt-4"
        />
        <p className="mt-2 text-sm text-muted" data-testid="product-availability">
          ★ {product.rating.toFixed(1)} · {product.available ? "В наличии" : "Нет в наличии"}
        </p>
        <p className="mt-6 text-text/90" data-testid="product-description">
          {product.description}
        </p>

        {specs.length > 0 ? (
          <dl className="mt-8 grid grid-cols-2 gap-3 border border-border bg-surface p-4 text-sm" data-testid="product-specs">
            {specs.map(([key, value]) => (
              <div key={key}>
                <dt className="text-muted">{key}</dt>
                <dd className="font-mono text-text">{String(value)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <AddToCartButton productId={product.id} available={product.available} />
      </div>
    </article>
  );
}
