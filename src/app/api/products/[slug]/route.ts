import { apiError, apiOk, STOCK_API_CACHE_HEADERS, withApiHandler } from "@/server/http";
import { getProductBySlug } from "@/server/services/catalog";

type Context = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: Context) {
  return withApiHandler(async () => {
    const { slug } = await context.params;
    const product = await getProductBySlug(slug);
    if (!product) {
      return apiError(404, "NOT_FOUND", "Товар не найден", undefined, STOCK_API_CACHE_HEADERS);
    }
    return apiOk(product, 200, STOCK_API_CACHE_HEADERS);
  }, "База данных недоступна");
}
