import { beforeEach, describe, expect, it, vi } from "vitest";

const findProductBySlug = vi.hoisted(() => vi.fn());
/** Успешные resolve обёртки unstable_cache — то, что Next положил бы в Data Cache. */
const cachedSuccesses = vi.hoisted(() => [] as unknown[]);

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: never[]) => Promise<unknown>) => {
    return async (...args: never[]) => {
      try {
        const result = await fn(...args);
        cachedSuccesses.push(result);
        return result;
      } catch (error) {
        // Как Next.js: ошибки не кэшируются.
        throw error;
      }
    };
  },
}));

vi.mock("@/server/repositories/catalog.repository", () => ({
  findProductBySlug: (...args: unknown[]) => findProductBySlug(...args),
  findCategoriesOrdered: vi.fn(),
  findBrandsOrdered: vi.fn(),
  countProducts: vi.fn(),
  findProductsPage: vi.fn(),
  findProductsByIds: vi.fn(),
}));

describe("getProductBySlug cache", () => {
  beforeEach(() => {
    findProductBySlug.mockReset();
    cachedSuccesses.length = 0;
  });

  it("не кладёт null (404) в Data Cache — иначе новый slug «не существует» до TTL", async () => {
    findProductBySlug.mockResolvedValue(null);
    const { getProductBySlug } = await import("./catalog");

    await expect(getProductBySlug("missing")).resolves.toBeNull();
    expect(findProductBySlug).toHaveBeenCalledWith("missing");
    expect(cachedSuccesses).toEqual([]);
  });
});
