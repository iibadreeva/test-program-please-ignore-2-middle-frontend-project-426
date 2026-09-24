import { apiError, apiOk, withApiHandler } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { createOrder, createOrderSchema, listOrders } from "@/server/services/orders";

export async function GET() {
  return withApiHandler(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }
    return apiOk(await listOrders(user.id));
  }, "Не удалось получить заказы");
}

export async function POST(request: Request) {
  return withApiHandler(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Некорректный JSON");
    }

    const parsed = createOrderSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", parsed.error.flatten());
    }

    const order = await createOrder(user.id, parsed.data);
    return apiOk(order, 201);
  }, "Не удалось создать заказ");
}
