import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUser = vi.hoisted(() => vi.fn());
const listOrders = vi.hoisted(() => vi.fn());
const createOrder = vi.hoisted(() => vi.fn());
const getOrderById = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("@/server/auth/session", () => ({
  getCurrentUser,
}));

vi.mock("@/server/services/orders", () => ({
  listOrders,
  createOrder,
  createOrderSchema: {
    safeParse: (json: unknown) => ({ success: true as const, data: json }),
  },
  getOrderById,
}));

describe("GET /api/orders", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    listOrders.mockReset();
  });

  it(
    "без сессии возвращает 401",
    async () => {
      getCurrentUser.mockResolvedValue(null);
      const { GET } = await import("@/app/api/orders/route");
      const res = await GET();
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(listOrders).not.toHaveBeenCalled();
    },
    15_000,
  );
});

describe("POST /api/orders", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    createOrder.mockReset();
  });

  it("без сессии возвращает 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/orders/route");
    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deliveryType: "pickup",
        recipientName: "Иван",
        phone: "+79990001122",
        items: [{ productId: "p1", quantity: 1 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe("GET /api/orders/[id]", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    getOrderById.mockReset();
  });

  it("без сессии возвращает 401", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/orders/[id]/route");
    const res = await GET(new Request("http://localhost/api/orders/ord-1"), {
      params: Promise.resolve({ id: "ord-1" }),
    });
    expect(res.status).toBe(401);
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it("чужой или отсутствующий заказ возвращает 404", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-a", email: "a@b.c", name: "A" });
    getOrderById.mockResolvedValue(null);
    const { GET } = await import("@/app/api/orders/[id]/route");
    const res = await GET(new Request("http://localhost/api/orders/ord-foreign"), {
      params: Promise.resolve({ id: "ord-foreign" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(getOrderById).toHaveBeenCalledWith("user-a", "ord-foreign");
  });
});
