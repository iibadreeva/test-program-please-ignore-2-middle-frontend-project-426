import { apiError, apiOk } from "@/server/http";
import { listPickupPoints } from "@/server/services/catalog";

export async function GET() {
  try {
    return apiOk(await listPickupPoints());
  } catch {
    return apiError(503, "INTERNAL_ERROR", "База данных недоступна");
  }
}
