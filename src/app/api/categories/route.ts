import { apiOk, withApiHandler } from "@/server/http";
import { listCategories } from "@/server/services/catalog";

export async function GET() {
  return withApiHandler(async () => apiOk(await listCategories()), "База данных недоступна");
}
