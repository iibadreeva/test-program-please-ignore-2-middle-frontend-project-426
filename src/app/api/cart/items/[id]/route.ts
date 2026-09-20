import { apiError, apiOk } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { CartError, removeCartItem, updateCartItemQuantity } from "@/server/services/cart";
import { updateCartItemBodySchema } from "@/shared/api-contract";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Некорректный JSON");
  }

  const parsed = updateCartItemBodySchema.safeParse(json);
  if (!parsed.success) {
    return apiError(400, "VALIDATION_ERROR", "Некорректное тело запроса", parsed.error.flatten());
  }

  try {
    const user = await getCurrentUser();
    const cart = await updateCartItemQuantity(id, parsed.data.quantity, user?.id);
    return apiOk(cart);
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

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;

  try {
    const user = await getCurrentUser();
    const cart = await removeCartItem(id, user?.id);
    return apiOk(cart);
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
