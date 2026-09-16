import Link from "next/link";
import { listProducts } from "@/server/services/catalog";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof listProducts>>["items"] = [];
  try {
    featured = (await listProducts({ sort: "rating_desc", perPage: 3 })).items;
  } catch {
    featured = [];
  }

  return (
    <div className="space-y-16">
      <section
        className="relative overflow-hidden rounded-none border-b border-border pb-16 pt-8 md:pt-16"
        data-testid="home-hero"
      >
        <p className="font-display text-5xl font-semibold tracking-tight text-text md:text-7xl">
          HexParts
        </p>
        <h1 className="mt-4 max-w-xl font-display text-2xl font-medium text-text md:text-3xl">
          Комплектующие для сборки без компромиссов
        </h1>
        <p className="mt-4 max-w-lg text-muted">
          Видеокарты, процессоры, память и остальное — с фильтрами по делу и заказом за несколько
          шагов.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/catalog"
            className="bg-accent px-5 py-2.5 font-medium text-bg transition hover:bg-accent-dim"
            data-testid="hero-cta-catalog"
          >
            В каталог
          </Link>
          <Link
            href="/catalog?category=graphics-cards"
            className="border border-border px-5 py-2.5 text-text transition hover:border-accent"
            data-testid="hero-cta-gpus"
          >
            Видеокарты
          </Link>
        </div>
      </section>

      <section aria-labelledby="promos-heading" data-testid="home-promos">
        <h2 id="promos-heading" className="font-display text-xl font-semibold">
          Подборки
        </h2>
        <p className="mt-1 text-sm text-muted">Быстрый переход к популярным категориям.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/catalog?category=graphics-cards", title: "Видеокарты", hint: "Игры и рендер" },
            { href: "/catalog?category=processors", title: "Процессоры", hint: "AMD и Intel" },
            { href: "/catalog?category=memory", title: "Память", hint: "DDR4 / DDR5" },
          ].map((promo) => (
            <li key={promo.href}>
              <Link
                href={promo.href}
                className="block border border-border bg-surface p-5 transition hover:border-accent"
                data-testid="promo-block"
              >
                <span className="font-display text-lg font-medium">{promo.title}</span>
                <span className="mt-1 block text-sm text-muted">{promo.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 ? (
        <section aria-labelledby="featured-heading" data-testid="home-featured">
          <h2 id="featured-heading" className="font-display text-xl font-semibold">
            Высокий рейтинг
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
