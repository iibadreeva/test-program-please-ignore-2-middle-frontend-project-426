import { Suspense } from "react";
import { CatalogCtaLink } from "@/components/nav-link";
import { PromoList } from "@/features/promos/promo-list";
import { reportUnexpectedError } from "@/server/observability/report";
import { listPromoBlocks } from "@/server/services/promos";
import type { PromoBlock } from "@/shared/api-contract";

/** Витрина промо: ISR + data-cache (сессия в layout больше не блокирует). */
export const revalidate = 60;

function HomeHero() {
  return (
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
        <CatalogCtaLink
          className="bg-accent px-5 py-2.5 font-medium text-bg transition hover:bg-accent-dim"
          data-testid="hero-cta-catalog"
        >
          В каталог
        </CatalogCtaLink>
      </div>
    </section>
  );
}

function PromoSkeleton() {
  return (
    <div data-testid="home-promo-loading" className="animate-pulse">
      <div className="bg-surface-2 h-7 w-48" />
      <div className="bg-surface-2 mt-2 h-4 w-72" />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="border-border bg-surface space-y-3 border p-5">
            <div className="bg-surface-2 h-6 w-3/4" />
            <div className="bg-surface-2 h-4 w-full" />
            <div className="bg-surface-2 h-4 w-5/6" />
            <div className="border-border space-y-2 border-t pt-3">
              <div className="bg-surface-2 h-4 w-2/3" />
              <div className="bg-surface-2 h-5 w-20" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function HomePromos() {
  let blocks: PromoBlock[] = [];
  try {
    blocks = await listPromoBlocks();
  } catch (error) {
    reportUnexpectedError(error);
    blocks = [];
  }
  return <PromoList blocks={blocks} />;
}

/**
 * Hero синхронный — soft-nav сразу показывает CTA.
 * Промо стримится через Suspense (data-cache listPromoBlocks).
 */
export default function HomePage() {
  return (
    <div className="space-y-16">
      <HomeHero />
      <Suspense fallback={<PromoSkeleton />}>
        <HomePromos />
      </Suspense>
    </div>
  );
}
