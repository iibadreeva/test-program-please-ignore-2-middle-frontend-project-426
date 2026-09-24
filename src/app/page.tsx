import Link from "next/link";
import { PromoList } from "@/features/promos/promo-list";
import { listPromoBlocks } from "@/server/services/promos";
import type { PromoBlock } from "@/shared/api-contract";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let blocks: PromoBlock[] = [];
  try {
    blocks = await listPromoBlocks();
  } catch (error) {
    console.error(error);
    blocks = [];
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
        </div>
      </section>

      <PromoList blocks={blocks} />
    </div>
  );
}
