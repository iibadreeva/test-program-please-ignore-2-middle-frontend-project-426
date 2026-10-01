import Link from "next/link";
import { ProductPrice } from "@/features/catalog/product-price";
import { routes } from "@/shared/routes";
import type { PromoBlock } from "@/shared/api-contract";

type Props = {
  blocks: PromoBlock[];
};

export function PromoList({ blocks }: Props) {
  return (
    <section aria-labelledby="promos-heading" data-testid="home-promo">
      <h2 id="promos-heading" className="font-display text-xl font-semibold">
        Сейчас в фокусе
      </h2>
      <p className="mt-1 text-sm text-muted">Подборки из каталога — клик ведёт на карточку товара.</p>

      {blocks.length === 0 ? (
        <p
          className="mt-6 border border-border bg-surface p-8 text-muted"
          data-testid="home-promo-empty"
        >
          Сейчас ничего не рекламируем. Загляните в{" "}
          <Link href={routes.catalog} className="text-accent hover:underline">
            каталог
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block) => (
            <li key={block.id}>
              <Link
                href={routes.product(block.product.slug)}
                prefetch={false}
                className="flex h-full flex-col border border-border bg-surface p-5 transition hover:border-accent"
                data-testid="home-promo-item"
              >
                <span className="font-display text-lg font-medium">{block.title}</span>
                <span className="mt-2 flex-1 text-sm text-muted">{block.text}</span>
                <div className="mt-4 border-t border-border pt-3">
                  <span className="block text-sm text-text">{block.product.title}</span>
                  <ProductPrice
                    price={block.product.price}
                    oldPrice={block.product.oldPrice}
                    size="sm"
                    oldPriceTestId="home-promo-old-price"
                    className="mt-1"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
