import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PromoList } from "@/features/promos/promo-list";
import type { PromoBlock } from "@/shared/api-contract";

function block(overrides: Partial<PromoBlock> = {}): PromoBlock {
  const productOverrides = overrides.product;
  return {
    id: "promo-1",
    title: "Игры в 1440p без компромиссов",
    text: "DLSS 3 и запас по трассировке.",
    ...overrides,
    product: {
      id: "prod-1",
      slug: "rtx-4070-super",
      title: "NVIDIA GeForce RTX 4070 SUPER 12GB",
      description: "Видеокарта для игр в 1440p.",
      price: "68990",
      imageUrl: "https://example.test/gpu.png",
      stock: 12,
      available: true,
      rating: 4.7,
      category: { id: "cat-1", slug: "graphics-cards", name: "Видеокарты" },
      brand: { id: "brand-1", slug: "nvidia", name: "NVIDIA" },
      ...productOverrides,
    },
  };
}

describe("PromoList", () => {
  it("renders promo blocks as links to product pages", () => {
    render(
      <PromoList
        blocks={[
          block(),
          block({
            id: "promo-2",
            title: "Игровой лидер на 3D V-Cache",
            text: "Максимальный FPS в современных играх.",
            product: {
              id: "prod-2",
              slug: "ryzen-7-7800x3d",
              title: "AMD Ryzen 7 7800X3D",
              description: "Игровой лидер на 3D V-Cache.",
              price: "38990",
              imageUrl: "https://example.test/cpu.png",
              stock: 15,
              available: true,
              rating: 4.9,
              category: { id: "cat-2", slug: "processors", name: "Процессоры" },
              brand: { id: "brand-2", slug: "amd", name: "AMD" },
            },
          }),
        ]}
      />,
    );

    expect(screen.getByTestId("home-promo")).toBeTruthy();
    const items = screen.getAllByTestId("home-promo-item");
    expect(items).toHaveLength(2);
    expect(items[0].tagName).toBe("A");
    expect(items[0].getAttribute("href")).toBe("/products/rtx-4070-super");
    expect(items[1].getAttribute("href")).toBe("/products/ryzen-7-7800x3d");
    expect(items[0].textContent).toContain("Игры в 1440p без компромиссов");
    expect(items[0].textContent).toContain("NVIDIA GeForce RTX 4070 SUPER 12GB");
    expect(items[0].textContent).toMatch(/68\s990\s₽/);
  });

  it("keeps the container and shows empty state when there are no blocks", () => {
    render(<PromoList blocks={[]} />);

    expect(screen.getByTestId("home-promo")).toBeTruthy();
    expect(screen.getByTestId("home-promo-empty")).toBeTruthy();
    expect(screen.queryAllByTestId("home-promo-item")).toHaveLength(0);
  });
});
