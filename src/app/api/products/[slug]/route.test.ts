import { beforeEach, describe, expect, it, vi } from "vitest";
import { STOCK_API_CACHE_HEADERS } from "@server/http";

const getProductBySlug = vi.hoisted(() => vi.fn());

vi.mock("@server/services/catalog", () => ({
  getProductBySlug: (...args: unknown[]) => getProductBySlug(...args),
}));

describe("GET /api/products/[slug]", () => {
  beforeEach(() => {
    getProductBySlug.mockReset();
  });

  it("на 404 отдаёт Cache-Control как у stock-ответов (private, no-store)", async () => {
    getProductBySlug.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(new Request("http://localhost/api/products/missing"), {
      params: Promise.resolve({ slug: "missing" }),
    });

    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe(STOCK_API_CACHE_HEADERS["Cache-Control"]);
  });
});
