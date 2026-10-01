import { describe, expect, it } from "vitest";
import { promoBlockWhere, serializePromoBlock } from "@/server/services/promos";

const productRow = {
  id: "prod-1",
  slug: "rtx-4070-super",
  title: "NVIDIA GeForce RTX 4070 SUPER 12GB",
  description: "Видеокарта для игр в 1440p.",
  price: 68990,
  oldPrice: 74990,
  imageUrl: "https://example.test/gpu.png",
  stock: 12,
  rating: 4.7,
  specs: { memory: "12 GB" },
  categoryId: "cat-1",
  brandId: "brand-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  category: { id: "cat-1", slug: "graphics-cards", name: "Видеокарты" },
  brand: { id: "brand-1", slug: "nvidia", name: "NVIDIA" },
};

describe("promoBlockWhere", () => {
  it("оставляет только блоки с товаром в наличии", () => {
    expect(promoBlockWhere()).toEqual({
      product: { stock: { gt: 0 } },
    });
  });
});

describe("serializePromoBlock", () => {
  it("встраивает ProductSummary с Money и availability", () => {
    const block = {
      id: "promo-1",
      title: "Игры в 1440p без компромиссов",
      text: "DLSS 3 и запас по трассировке — карта, с которой сборка сразу играет.",
      sortOrder: 0,
      productId: productRow.id,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      product: productRow,
    };

    const serialized = serializePromoBlock(block);

    expect(serialized).toEqual({
      id: "promo-1",
      title: "Игры в 1440p без компромиссов",
      text: "DLSS 3 и запас по трассировке — карта, с которой сборка сразу играет.",
      product: {
        id: "prod-1",
        slug: "rtx-4070-super",
        title: "NVIDIA GeForce RTX 4070 SUPER 12GB",
        description: "Видеокарта для игр в 1440p.",
        price: "68990",
        oldPrice: "74990",
        imageUrl: "https://example.test/gpu.png",
        stock: 12,
        available: true,
        rating: 4.7,
        category: { id: "cat-1", slug: "graphics-cards", name: "Видеокарты" },
        brand: { id: "brand-1", slug: "nvidia", name: "NVIDIA" },
      },
    });
  });
});
