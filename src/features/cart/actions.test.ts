import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/catalog", () => ({
  listProductsByIds: vi.fn().mockResolvedValue([]),
}));

import { listProductsByIds } from "@/server/services/catalog";
import { getCartProducts } from "@/features/cart/actions";
import { MAX_CART_IDS } from "@/shared/constants";

const mockedList = vi.mocked(listProductsByIds);

describe("getCartProducts", () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedList.mockResolvedValue([]);
  });

  it("rejects more than MAX_CART_IDS product ids", async () => {
    const ids = Array.from({ length: MAX_CART_IDS + 1 }, (_, i) => `prod-${i}`);
    await expect(getCartProducts(ids)).rejects.toThrow(/не больше/);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("dedupes ids and forwards at most MAX_CART_IDS", async () => {
    await getCartProducts(["a", "a", "b"]);
    expect(mockedList).toHaveBeenCalledWith(["a", "b"]);
  });
});
