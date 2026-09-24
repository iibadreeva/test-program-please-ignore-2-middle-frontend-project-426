import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard, type ProductCardData } from "@/features/catalog/product-card";
import { PRODUCT_PLACEHOLDER_SRC } from "@/features/catalog/product-image";

function product(overrides: Partial<ProductCardData> = {}): ProductCardData {
  return {
    id: "prod-1",
    slug: "rtx-4070-super",
    title: "NVIDIA GeForce RTX 4070 SUPER 12GB",
    description: "Видеокарта для игр в 1440p.",
    price: "68990",
    imageUrl: "https://example.test/gpu.png",
    available: true,
    rating: 4.7,
    brand: { name: "NVIDIA" },
    category: { name: "Видеокарты" },
    ...overrides,
  };
}

describe("ProductCard", () => {
  it("shows the name, price, description and availability", () => {
    render(<ProductCard product={product()} />);

    expect(screen.getByTestId("catalog-item-name").textContent).toBe(
      "NVIDIA GeForce RTX 4070 SUPER 12GB",
    );
    expect(screen.getByTestId("catalog-item-price").textContent).toMatch(/68\s990\s₽/);
    expect(screen.getByTestId("catalog-item-description").textContent).toBe(
      "Видеокарта для игр в 1440p.",
    );
    expect(screen.getByTestId("catalog-item-availability")).toBeTruthy();
  });

  it("links the name to the product page", () => {
    render(<ProductCard product={product({ slug: "ryzen-5-7600" })} />);

    const name = screen.getByTestId("catalog-item-name");
    expect(name.tagName).toBe("A");
    expect(name.getAttribute("href")).toBe("/products/ryzen-5-7600");
  });

  it("marks an available product with data-available=true", () => {
    render(<ProductCard product={product({ available: true })} />);

    const availability = screen.getByTestId("catalog-item-availability");
    expect(availability.getAttribute("data-available")).toBe("true");
    expect(availability.textContent).toBe("В наличии");
  });

  it("keeps an unavailable product in the list and marks it", () => {
    render(<ProductCard product={product({ available: false })} />);

    const availability = screen.getByTestId("catalog-item-availability");
    expect(availability.getAttribute("data-available")).toBe("false");
    expect(availability.textContent).toBe("Нет в наличии");
  });

  it("renders the placeholder when a product has no image", () => {
    render(<ProductCard product={product({ imageUrl: null })} />);

    const image = screen.getByTestId("catalog-item-image");
    expect(image.getAttribute("src")).toBe(PRODUCT_PLACEHOLDER_SRC);
    expect(image.getAttribute("data-placeholder")).toBe("true");
  });

  it("keeps the real image when there is one", () => {
    render(<ProductCard product={product()} />);

    const image = screen.getByTestId("catalog-item-image");
    expect(image.getAttribute("src")).toBe("https://example.test/gpu.png");
    expect(image.getAttribute("data-placeholder")).toBe("false");
  });

  it("allows another test id prefix so reuse outside the catalog is unambiguous", () => {
    render(<ProductCard product={product()} testIdPrefix="featured-item" />);

    expect(screen.getByTestId("featured-item-name")).toBeTruthy();
    expect(screen.queryByTestId("catalog-item")).toBeNull();
  });
});
