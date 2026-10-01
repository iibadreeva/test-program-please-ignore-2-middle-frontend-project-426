import { apiError, apiOk, withApiHandler } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { getOrderById } from "@/server/services/orders";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  return withApiHandler(async () => {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }

    const { id } = await context.params;
    const order = await getOrderById(user.id, id);
    if (!order) {
      return apiError(404, "NOT_FOUND", "Заказ не найден");
    }
    return apiOk(order);
  }, "Не удалось получить заказ");
}
