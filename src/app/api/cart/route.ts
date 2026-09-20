import { apiError, apiNoContent, apiOk } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { CartError, clearCart, getCartView } from "@/server/services/cart";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return apiOk(await getCartView(user?.id));
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    await clearCart(user?.id);
    return apiNoContent();
  } catch (error) {
    if (error instanceof CartError) {
      return apiError(400, error.code, error.message);
    }
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
