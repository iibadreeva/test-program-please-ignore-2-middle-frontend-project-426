import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

const getProductBySlug = vi.hoisted(() => vi.fn());

vi.mock("@server/services/catalog", () => ({
  getProductBySlug: (...args: unknown[]) => getProductBySlug(...args),
}));

vi.mock("@/features/cart/add-to-cart-button", () => ({
  AddToCartButton: () => null,
}));

vi.mock("@/features/catalog/product-image", () => ({
  ProductImage: () => null,
}));

vi.mock("@/features/catalog/product-price", () => ({
  ProductPrice: () => null,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("ProductPage availability", () => {
  beforeEach(() => {
    getProductBySlug.mockReset();
  });

  it("показывает наличие без точного числа stock (витрина eventual-consistent)", async () => {
    getProductBySlug.mockResolvedValue({
      id: "p1",
      slug: "gpu",
      title: "GPU",
      description: "desc",
      price: "1000",
      imageUrl: "/gpu.png",
      stock: 42,
      available: true,
      rating: 4.5,
      category: { id: "c1", slug: "gpu", name: "Видеокарты" },
      brand: { id: "b1", slug: "nvidia", name: "NVIDIA" },
      specs: null,
    });

    const { default: ProductPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductPage({ params: Promise.resolve({ slug: "gpu" }) }),
    );

    expect(html).toContain('data-testid="product-availability"');
    expect(html).toContain("В наличии");
    expect(html).not.toMatch(/в наличии:\s*42/i);
    expect(html).not.toContain(">42<");
  });

  it("для недоступного товара пишет «Нет в наличии»", async () => {
    getProductBySlug.mockResolvedValue({
      id: "p1",
      slug: "gpu",
      title: "GPU",
      description: "desc",
      price: "1000",
      imageUrl: "/gpu.png",
      stock: 0,
      available: false,
      rating: 4.5,
      category: { id: "c1", slug: "gpu", name: "Видеокарты" },
      brand: { id: "b1", slug: "nvidia", name: "NVIDIA" },
      specs: null,
    });

    const { default: ProductPage } = await import("./page");
    const html = renderToStaticMarkup(
      await ProductPage({ params: Promise.resolve({ slug: "gpu" }) }),
    );

    expect(html).toContain("Нет в наличии");
  });
});
