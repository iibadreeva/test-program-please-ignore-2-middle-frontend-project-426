import { apiError, apiOk } from "@/server/http";
import { listPromoBlocks } from "@/server/services/promos";

export async function GET() {
  try {
    return apiOk(await listPromoBlocks());
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
