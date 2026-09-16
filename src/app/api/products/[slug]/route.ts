import { apiError, apiOk } from "@/server/http";
import { getProductBySlug } from "@/server/services/catalog";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  const { slug } = await context.params;

  try {
    const product = await getProductBySlug(slug);
    if (!product) {
      return apiError(404, "NOT_FOUND", "Товар не найден");
    }
    return apiOk(product);
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
