import { describe, expect, it } from "vitest";
import {
  addRef,
  clampedRefs,
  mergeWithProducts,
  normalizeRefs,
  removeRef,
  setRefQuantity,
  type CartRef,
} from "@/features/cart/cart-items";
import type { ProductSummary } from "@/shared/api-contract";
import { MAX_CART_IDS } from "@/shared/constants";

function product(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: "prod-1",
    slug: "gpu",
    title: "GPU",
    description: "Видеокарта",
    price: "1000",
    imageUrl: "/gpu.png",
    stock: 10,
    available: true,
    rating: 4.5,
    category: { id: "c1", slug: "graphics-cards", name: "Видеокарты" },
    brand: { id: "b1", slug: "nvidia", name: "NVIDIA" },
    ...overrides,
  };
}

describe("normalizeRefs", () => {
  it("keeps valid refs and drops junk", () => {
    expect(
      normalizeRefs([
        { productId: "a", quantity: 2 },
        { productId: "", quantity: 1 },
        { productId: "b", quantity: 0 },
        { productId: "c", quantity: 1.5 },
        null,
        "x",
        { productId: "a", quantity: 3 },
      ]),
    ).toEqual([{ productId: "a", quantity: 3 }]);
  });

  it("keeps at most MAX_CART_IDS distinct products", () => {
    const raw = Array.from({ length: MAX_CART_IDS + 10 }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
    }));
    const normalized = normalizeRefs(raw);
    expect(normalized).toHaveLength(MAX_CART_IDS);
    expect(normalized[0]?.productId).toBe("prod-0");
    expect(normalized.at(-1)?.productId).toBe(`prod-${MAX_CART_IDS - 1}`);
  });
});

describe("addRef / setRefQuantity / removeRef", () => {
  it("adds a new line and increments an existing one", () => {
    const once = addRef([], "prod-1", 1);
    expect(once).toEqual([{ productId: "prod-1", quantity: 1 }]);
    expect(addRef(once, "prod-1", 2)).toEqual([{ productId: "prod-1", quantity: 3 }]);
  });

  it("does not add a new product when cart already has MAX_CART_IDS lines", () => {
    const full = Array.from({ length: MAX_CART_IDS }, (_, i) => ({
      productId: `prod-${i}`,
      quantity: 1,
    }));
    expect(addRef(full, "prod-new", 1)).toEqual(full);
    expect(addRef(full, "prod-0", 1)[0]?.quantity).toBe(2);
  });

  it("updates quantity and removes on zero", () => {
    const refs: CartRef[] = [{ productId: "prod-1", quantity: 2 }];
    expect(setRefQuantity(refs, "prod-1", 5)).toEqual([{ productId: "prod-1", quantity: 5 }]);
    expect(setRefQuantity(refs, "prod-1", 0)).toEqual([]);
    expect(removeRef(refs, "prod-1")).toEqual([]);
  });
});

describe("mergeWithProducts", () => {
  it("builds lines with fresh prices and totals", () => {
    const refs: CartRef[] = [
      { productId: "prod-1", quantity: 2 },
      { productId: "prod-2", quantity: 1 },
    ];
    const result = mergeWithProducts(refs, [
      product({ id: "prod-1", price: "1000" }),
      product({ id: "prod-2", price: "500", title: "SSD", slug: "ssd" }),
    ]);

    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.lineTotal).toBe("2000");
    expect(result.lines[1]?.lineTotal).toBe("500");
    expect(result.total).toBe("2500");
    expect(result.itemsCount).toBe(3);
    expect(result.broken).toEqual([]);
  });

  it("moves missing or unavailable products to broken", () => {
    const refs: CartRef[] = [
      { productId: "gone", quantity: 1 },
      { productId: "prod-1", quantity: 2 },
      { productId: "oos", quantity: 1 },
    ];
    const result = mergeWithProducts(refs, [
      product({ id: "prod-1", price: "1000" }),
      product({ id: "oos", available: false, stock: 0, price: "900" }),
    ]);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.product.id).toBe("prod-1");
    expect(result.broken).toEqual([
      { productId: "gone", quantity: 1 },
      { productId: "oos", quantity: 1 },
    ]);
    expect(result.total).toBe("2000");
    expect(result.itemsCount).toBe(2);
  });

  it("clamps line quantity to product stock", () => {
    const result = mergeWithProducts([{ productId: "prod-1", quantity: 5 }], [
      product({ id: "prod-1", stock: 2, price: "1000" }),
    ]);

    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.quantity).toBe(2);
    expect(result.lines[0]?.lineTotal).toBe("2000");
    expect(result.itemsCount).toBe(2);
  });

  it("clamps stock and drops missing/unavailable refs for store sync", () => {
    const refs: CartRef[] = [
      { productId: "prod-1", quantity: 5 },
      { productId: "gone", quantity: 1 },
      { productId: "oos", quantity: 2 },
    ];
    expect(
      clampedRefs(refs, [
        product({ id: "prod-1", stock: 2 }),
        product({ id: "oos", available: false, stock: 0 }),
      ]),
    ).toEqual([{ productId: "prod-1", quantity: 2 }]);
  });
});
