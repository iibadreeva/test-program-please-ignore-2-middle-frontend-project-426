import { apiOk, withApiHandler } from "@/server/http";
import { listPromoBlocks } from "@/server/services/promos";

export async function GET() {
  return withApiHandler(async () => apiOk(await listPromoBlocks()), "База данных недоступна");
}
