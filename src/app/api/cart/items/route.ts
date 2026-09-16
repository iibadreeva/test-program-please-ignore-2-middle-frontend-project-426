import { z } from "zod";
import { apiError, apiOk } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { addCartItem, CartError } from "@/server/services/cart";

const bodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().optional().default(1),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Некорректный JSON");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Некорректное тело запроса", parsed.error.flatten());
  }

  try {
    const user = await getCurrentUser();
    const cart = await addCartItem(parsed.data.productId, parsed.data.quantity, user?.id);
    return apiOk(cart, 201);
  } catch (error) {
    if (error instanceof CartError) {
      return apiError(
        error.code === "NOT_FOUND" ? 404 : 400,
        error.code,
        error.message,
      );
    }
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
