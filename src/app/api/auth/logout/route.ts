import { apiNoContent, withApiHandler } from "@/server/http";
import { logoutUser } from "@/server/services/auth";

export async function POST() {
  return withApiHandler(async () => {
    await logoutUser();
    return apiNoContent();
  }, "Не удалось выйти");
}
