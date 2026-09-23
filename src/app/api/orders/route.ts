import { apiError, apiOk } from "@/server/http";
import { AuthError, getCurrentUser } from "@/server/auth/session";
import {
  createOrder,
  createOrderSchema,
  OrderError,
  OrderItemsUnavailableError,
  listOrders,
} from "@/server/services/orders";
import { ZodError } from "zod";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Требуется вход");
    }
    return apiOk(await listOrders(user.id));
  } catch (error) {
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось получить заказы");
  }
}

export async function POST(request: Request) {
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

  try {
    const order = await createOrder(user.id, parsed.data);
    return apiOk(order, 201);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Некорректные данные", error.flatten());
    }
    if (error instanceof OrderItemsUnavailableError) {
      return apiError(409, "ORDER_ITEMS_UNAVAILABLE", error.message, error.problems);
    }
    if (error instanceof OrderError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "UNAUTHORIZED"
            ? 401
            : error.code === "CONFLICT"
              ? 409
              : 400;
      return apiError(status, error.code, error.message);
    }
    if (error instanceof AuthError) {
      return apiError(401, "UNAUTHORIZED", error.message);
    }
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось создать заказ");
  }
}
