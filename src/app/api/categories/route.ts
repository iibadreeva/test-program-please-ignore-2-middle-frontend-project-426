import { apiError, apiOk } from "@/server/http";
import { listCategories } from "@/server/services/catalog";

export async function GET() {
  try {
    return apiOk(await listCategories());
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
