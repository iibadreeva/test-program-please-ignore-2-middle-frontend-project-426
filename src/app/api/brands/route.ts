import { apiError, apiOk } from "@/server/http";
import { listBrands } from "@/server/services/catalog";

export async function GET() {
  try {
    return apiOk(await listBrands());
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
