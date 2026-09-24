import { apiOk, withApiHandler } from "@/server/http";
import { listBrands } from "@/server/services/catalog";

export async function GET() {
  return withApiHandler(async () => apiOk(await listBrands()), "База данных недоступна");
}
