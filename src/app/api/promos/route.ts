import { apiOk, STOCK_API_CACHE_HEADERS, withApiHandler } from "@server/http";
import { listPromoBlocks } from "@server/services/promos";

export async function GET() {
  return withApiHandler(
    async () => apiOk(await listPromoBlocks(), 200, STOCK_API_CACHE_HEADERS),
    "База данных недоступна",
  );
}
