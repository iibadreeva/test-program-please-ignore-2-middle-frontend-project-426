import { apiOk, PUBLIC_API_CACHE_HEADERS, withApiHandler } from "@server/http";
import { listBrands } from "@server/services/catalog";

export async function GET() {
  return withApiHandler(
    async () => apiOk(await listBrands(), 200, PUBLIC_API_CACHE_HEADERS),
    "База данных недоступна",
  );
}
