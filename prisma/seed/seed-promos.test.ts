import { describe, expect, it, vi } from "vitest";
import { seedPromos } from "./seed-promos";
import type { SeedDb } from "./types";

type PromoInput = {
  productSlug: string;
  title: string;
  text: string;
  sortOrder: number;
};

function mockDb(options: {
  products: Record<string, { id: string; stock: number } | null>;
}) {
  const deleteMany = vi.fn(async () => ({ count: 0 }));
  const upsert = vi.fn(async () => ({}));
  const findUnique = vi.fn(async ({ where }: { where: { slug: string } }) => {
    return options.products[where.slug] ?? null;
  });

  const prisma = {
    product: { findUnique },
    promoBlock: { upsert, deleteMany },
  } as unknown as SeedDb;

  return { prisma, deleteMany, upsert };
}

describe("seedPromos", () => {
  const blocks: PromoInput[] = [
    {
      productSlug: "gpu-1",
      title: "Промо",
      text: "Текст",
      sortOrder: 0,
    },
  ];

  it("не сносит все промо, если блоки есть, но все skipped", async () => {
    const { prisma, deleteMany, upsert } = mockDb({
      products: { "gpu-1": null },
    });

    const count = await seedPromos(prisma, blocks);

    expect(count).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("не сносит все промо при OOS skip", async () => {
    const { prisma, deleteMany } = mockDb({
      products: { "gpu-1": { id: "p1", stock: 0 } },
    });

    await seedPromos(prisma, blocks);

    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("при успешном seed удаляет только orphan-блоки", async () => {
    const { prisma, deleteMany, upsert } = mockDb({
      products: { "gpu-1": { id: "p1", stock: 5 } },
    });

    const count = await seedPromos(prisma, blocks);

    expect(count).toBe(1);
    expect(upsert).toHaveBeenCalledOnce();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { productId: { notIn: ["p1"] } },
    });
  });

  it("пустой список промо — намеренно чистит все блоки", async () => {
    const { prisma, deleteMany } = mockDb({ products: {} });

    const count = await seedPromos(prisma, []);

    expect(count).toBe(0);
    expect(deleteMany).toHaveBeenCalledWith();
  });
});
