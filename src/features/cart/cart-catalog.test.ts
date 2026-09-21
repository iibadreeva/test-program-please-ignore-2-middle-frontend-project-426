import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/cart/actions", () => ({
  getCartProducts: vi.fn(),
}));

import { getCartProducts } from "@/features/cart/actions";
import {
  __resetCartCatalogForTests,
  loadCartCatalog,
} from "@/features/cart/cart-catalog";
import type { ProductSummary } from "@/shared/api-contract";

const mockedGetCartProducts = vi.mocked(getCartProducts);

function product(id: string): ProductSummary {
  return {
    id,
    slug: id,
    title: id,
    description: "",
    price: "100",
    imageUrl: "/",
    stock: 5,
    available: true,
    rating: 4,
    category: { id: "c1", slug: "cat", name: "Cat" },
    brand: { id: "b1", slug: "brand", name: "Brand" },
  };
}

describe("loadCartCatalog", () => {
  beforeEach(() => {
    __resetCartCatalogForTests();
    mockedGetCartProducts.mockReset();
  });

  it("dedupes in-flight requests for the same ids", async () => {
    let resolve!: (value: ProductSummary[]) => void;
    mockedGetCartProducts.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );

    const a = loadCartCatalog(["p1", "p2"]);
    const b = loadCartCatalog(["p1", "p2"]);

    expect(mockedGetCartProducts).toHaveBeenCalledTimes(1);

    resolve([product("p1"), product("p2")]);
    await expect(a).resolves.toEqual([product("p1"), product("p2")]);
    await expect(b).resolves.toEqual([product("p1"), product("p2")]);
  });

  it("starts a new request when ids change", async () => {
    mockedGetCartProducts
      .mockResolvedValueOnce([product("p1")])
      .mockResolvedValueOnce([product("p2")]);

    await loadCartCatalog(["p1"]);
    await loadCartCatalog(["p2"]);

    expect(mockedGetCartProducts).toHaveBeenCalledTimes(2);
  });
});
