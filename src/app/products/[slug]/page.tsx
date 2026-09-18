import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/add-to-cart-button";
import { formatPrice } from "@/shared/format";
import { getProductBySlug } from "@/server/services/catalog";

export const dynamic = "force-dynamic";

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.imageUrl}
        alt={product.title}
        className="aspect-[4/3] w-full border border-border bg-surface object-cover"
        data-testid="product-image"
      />

      <div>
        <p className="text-sm text-muted">
          <Link href={`/catalog?category=${product.category.slug}`} className="hover:text-accent">
            {product.category.name}
          </Link>
          {" · "}
          {product.brand.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold" data-testid="product-title">
          {product.title}
        </h1>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-mono text-2xl text-accent" data-testid="product-price">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice ? (
            <span className="font-mono text-muted line-through">
              {formatPrice(product.oldPrice)}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-muted">★ {product.rating.toFixed(1)} · в наличии: {product.stock}</p>
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

        <AddToCartButton productId={product.id} disabled={product.stock <= 0} />
      </div>
    </article>
  );
}
