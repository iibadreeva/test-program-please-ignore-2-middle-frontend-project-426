import { apiError, apiNoContent } from "@/server/http";
import { logoutUser } from "@/server/services/auth";

export async function POST() {
  try {
    await logoutUser();
    return apiNoContent();
  } catch (error) {
    console.error(error);
    return apiError(503, "INTERNAL_ERROR", "Не удалось выйти");
  }
}
